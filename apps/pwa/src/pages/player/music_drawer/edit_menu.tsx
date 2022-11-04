import Popup from '#/components/popup';
import { CSSProperties, MouseEventHandler, useEffect, useState } from 'react';
import MenuItem from '#/components/menu_item';
import {
  MdDelete,
  MdOutlineFilePresent,
  MdTitle,
  MdGroup,
  MdTextFields,
  MdImage,
} from 'react-icons/md';
import { CSSVariable } from '#/global_style';
import styled from 'styled-components';
import notice from '#/utils/notice';
import {
  AllowUpdateKey,
  LYRIC_MAX_LENGTH,
  MusicType,
  MUSIC_MAX_LRYIC_AMOUNT,
  NAME_MAX_LENGTH,
  ALIAS_MAX_LENGTH,
  MUSIC_MAX_ALIAS_COUNT,
} from '#/constants/music';
import uploadAsset from '@/server/upload_asset';
import { AssetType, ASSET_TYPE_MAP } from '#/constants';
import updateMusic from '@/server/update_music';
import stringArrayEqual from '#/utils/string_array_equal';
import dialog from '#/utils/dialog';
import deleteMusic from '@/server/delete_music';
import logger from '#/utils/logger';
import { Option } from '#/components/multiple_select';
import searchSingerRequest from '@/server/search_singer';
import { Singer, ZIndex } from '../constants';
import { MusicDetail } from './constants';
import e, { EventType } from './eventemitter';
import playerEventemitter, {
  EventType as PlayerEventType,
  EditDialogType,
} from '../eventemitter';
import { emitMusicUpdated } from '../utils';

const formatSingerToMultipleSelectOption = (
  singer: Singer,
): Option<Singer> => ({
  key: singer.id,
  label: `${singer.name}${
    singer.aliases.length ? `(${singer.aliases[0]})` : ''
  }`,
  value: singer,
});
const searchSinger = (search: string): Promise<Option<Singer>[]> => {
  const keyword = search.trim();
  return searchSingerRequest({ keyword, page: 1, pageSize: 50 }).then((data) =>
    data.singerList.map(formatSingerToMultipleSelectOption),
  );
};
const Style = styled.div`
  padding: 5px 0;
`;
const maskProps: {
  style: CSSProperties;
  onClick: MouseEventHandler<HTMLDivElement>;
} = {
  style: { zIndex: ZIndex.POPUP },
  onClick: (event) => event.stopPropagation(),
};
const bodyProps: { style: CSSProperties } = {
  style: { width: 300 },
};
const dangerousIconStyle: CSSProperties = {
  color: CSSVariable.COLOR_DANGEROUS,
};

function EditMenu({ music }: { music: MusicDetail }) {
  const [open, setOpen] = useState(false);
  // const [open, setOpen] = useState(true);
  const onClose = () => setOpen(false);

  useEffect(() => {
    const unlistenOpen = e.listen(EventType.OPEN_EDIT_MENU, () =>
      setOpen(true),
    );
    return unlistenOpen;
  }, []);

  return (
    <Popup
      open={open}
      onClose={onClose}
      maskProps={maskProps}
      bodyProps={bodyProps}
    >
      <Style onClick={onClose}>
        <MenuItem
          icon={<MdImage />}
          label="编辑封面"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              title: '编辑封面',
              type: EditDialogType.COVER,
              onSubmit: async (cover: Blob | undefined) => {
                if (typeof cover === 'undefined') {
                  throw new Error('请选择封面');
                }
                const { id: assetId } = await uploadAsset(
                  cover,
                  AssetType.MUSIC_COVER,
                );
                await updateMusic({
                  id: music.id,
                  key: AllowUpdateKey.COVER,
                  value: assetId,
                });
                emitMusicUpdated(music.id);
              },
            })
          }
        />
        <MenuItem
          icon={<MdTitle />}
          label="编辑名字"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              title: '编辑名字',
              type: EditDialogType.INPUT,
              label: '名字',
              initialValue: music.name,
              onSubmit: async (name: string) => {
                const trimmedName = name.replace(/\s+/g, ' ').trim();

                if (!trimmedName.length) {
                  throw new Error('请输入名字');
                }
                if (trimmedName.length > NAME_MAX_LENGTH) {
                  throw new Error('名字过长');
                }

                if (trimmedName !== music.name) {
                  await updateMusic({
                    id: music.id,
                    key: AllowUpdateKey.NAME,
                    value: trimmedName,
                  });
                  emitMusicUpdated(music.id);
                }
              },
            })
          }
        />
        <MenuItem
          icon={<MdTextFields />}
          label="编辑别名"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              title: '编辑别名',
              type: EditDialogType.INPUT_LIST,
              label: '别名',
              initialValue: music.aliases,
              max: MUSIC_MAX_ALIAS_COUNT,
              maxLength: ALIAS_MAX_LENGTH,
              onSubmit: async (aliases: string[]) => {
                const trimmedAliases = aliases
                  .map((a) => a.replace(/\s+/g, ' ').trim())
                  .filter((a) => a.length > 0);

                if (!stringArrayEqual(trimmedAliases, music.aliases)) {
                  await updateMusic({
                    id: music.id,
                    key: AllowUpdateKey.ALIASES,
                    value: trimmedAliases,
                  });
                  emitMusicUpdated(music.id);
                }
              },
            })
          }
        />
        {music.type === MusicType.SONG ? (
          <MenuItem
            icon={<MdTextFields />}
            label="编辑歌词"
            onClick={() =>
              playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
                type: EditDialogType.TEXTAREA_LIST,
                title: '编辑歌词',
                label: '歌词',
                initialValue: music.lyrics.map((l) => l.content),
                max: MUSIC_MAX_LRYIC_AMOUNT,
                maxLength: LYRIC_MAX_LENGTH,
                placeholder: 'LRC 格式的文本',
                onSubmit: async (lyrics: string[]) => {
                  const trimmedLyrics = lyrics
                    .map((l) => l.trim())
                    .filter((l) => l.length > 0);

                  if (
                    !stringArrayEqual(
                      trimmedLyrics,
                      music.lyrics.map((l) => l.content),
                    )
                  ) {
                    await updateMusic({
                      id: music.id,
                      key: AllowUpdateKey.LYRIC,
                      value: trimmedLyrics,
                    });
                    emitMusicUpdated(music.id);
                  }
                },
              })
            }
          />
        ) : null}
        <MenuItem
          icon={<MdGroup />}
          label="编辑歌手列表"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              type: EditDialogType.MULTIPLE_SELECT,
              label: '歌手列表',
              title: '编辑歌手列表',
              dataGetter: searchSinger,
              initialValue: music.singers.map(
                formatSingerToMultipleSelectOption,
              ),
              onSubmit: async (singers: Option<Singer>[]) => {
                if (!singers.length) {
                  throw new Error('请选择歌手');
                }

                if (
                  !stringArrayEqual(
                    music.singers.map((s) => s.id).sort(),
                    singers.map((s) => s.value.id).sort(),
                  )
                ) {
                  await updateMusic({
                    id: music.id,
                    key: AllowUpdateKey.SINGER,
                    value: singers.map((s) => s.value.id),
                  });
                  emitMusicUpdated(music.id);
                }
              },
            })
          }
        />
        <MenuItem
          icon={<MdOutlineFilePresent />}
          label="编辑标准音质文件"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              type: EditDialogType.FILE,
              label: '标准音质文件',
              title: '编辑标准音质文件',
              acceptTypes: ASSET_TYPE_MAP[AssetType.MUSIC_SQ].acceptTypes,
              placeholder: `选择文件, 支持以下类型 ${ASSET_TYPE_MAP[
                AssetType.MUSIC_SQ
              ].acceptTypes.join(',')}`,
              onSubmit: async (file: File | null) => {
                if (!file) {
                  throw new Error('请选择文件');
                }
                const { id } = await uploadAsset(file, AssetType.MUSIC_SQ);
                await updateMusic({
                  id: music.id,
                  key: AllowUpdateKey.SQ,
                  value: id,
                });
                emitMusicUpdated(music.id);
              },
            })
          }
        />
        <MenuItem
          icon={<MdOutlineFilePresent />}
          label="编辑无损音质文件"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              type: EditDialogType.FILE,
              label: '无损音质文件',
              title: '编辑无损音质文件',
              acceptTypes: ASSET_TYPE_MAP[AssetType.MUSIC_HQ].acceptTypes,
              placeholder: `选择文件, 支持以下类型 ${ASSET_TYPE_MAP[
                AssetType.MUSIC_HQ
              ].acceptTypes.join(',')}`,
              onSubmit: async (file: File | null) => {
                if (!file) {
                  throw new Error('请选择文件');
                }
                const { id } = await uploadAsset(file, AssetType.MUSIC_HQ);
                await updateMusic({
                  id: music.id,
                  key: AllowUpdateKey.HQ,
                  value: id,
                });
                emitMusicUpdated(music.id);
              },
            })
          }
        />
        <MenuItem
          icon={<MdOutlineFilePresent />}
          label="编辑伴奏文件"
          onClick={() =>
            playerEventemitter.emit(PlayerEventType.OPEN_EDIT_DIALOG, {
              type: EditDialogType.FILE,
              label: '伴奏文件',
              title: '编辑伴奏文件',
              acceptTypes: ASSET_TYPE_MAP[AssetType.MUSIC_AC].acceptTypes,
              placeholder: `选择文件, 支持以下类型 ${ASSET_TYPE_MAP[
                AssetType.MUSIC_AC
              ].acceptTypes.join(',')}`,
              onSubmit: async (file: File | null) => {
                if (!file) {
                  throw new Error('请选择文件');
                }
                const { id } = await uploadAsset(file, AssetType.MUSIC_AC);
                await updateMusic({
                  id: music.id,
                  key: AllowUpdateKey.AC,
                  value: id,
                });
                emitMusicUpdated(music.id);
              },
            })
          }
        />
        <MenuItem
          icon={<MdDelete style={dangerousIconStyle} />}
          label="删除"
          onClick={() => {
            if (music.forkList.length) {
              return notice.error('被二次创作音乐无法被删除');
            }
            return dialog.confirm({
              title: '确定删除音乐吗?',
              content: '注意, 音乐删除后无法恢复',
              onConfirm: () =>
                dialog.confirm({
                  title: '确定删除音乐吗?',
                  content: '这是第二次确认, 也是最后一次',
                  onConfirm: async () => {
                    try {
                      await deleteMusic(music.id);
                      notice.info('已删除');
                      playerEventemitter.emit(PlayerEventType.MUSIC_DELETED, {
                        id: music.id,
                      });
                    } catch (error) {
                      logger.error(error, '删除音乐失败');
                      notice.error(error.message);
                    }
                  },
                }),
            });
          }}
        />
      </Style>
    </Popup>
  );
}

export default EditMenu;