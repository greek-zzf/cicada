import { Query } from '@/constants';
import styled, { css } from 'styled-components';
import TabList from '#/components/tab_list';
import useNavigate from '#/utils/use_navigate';
import mm from '@/global_states/mini_mode';
import Input from './input';
import { HEADER_HEIGHT } from '../../constants';
import Page from '../page';
import { Tab, TOOLBAR_HEIGHT } from './constants';
import Content from './content';
import useTab from './use_tab';

const Style = styled(Page)`
  position: relative;

  margin-top: ${HEADER_HEIGHT}px;

  > .toolbar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: ${TOOLBAR_HEIGHT}px;

    padding: 0 20px 5px 20px;

    display: flex;
    align-items: flex-end;
    gap: 20px;

    backdrop-filter: blur(5px);
  }

  ${({ theme: { miniMode } }) => css`
    > .toolbar {
      > .guide-box {
        flex: ${miniMode ? 'unset' : 1};
      }
    }
  `}
`;

function Search({ exploration }: { exploration: boolean }) {
  const navigate = useNavigate();
  const miniMode = mm.useState();
  const { tab, tabList } = useTab(exploration);

  return (
    <Style>
      <Content tab={tab} exploration={exploration} />
      <div className="toolbar">
        {miniMode && !exploration ? <Input /> : null}
        <TabList<Tab>
          current={tab}
          tabList={tabList}
          onChange={(t) =>
            navigate({
              query: {
                [Query.SEARCH_TAB]: t,
                [Query.PAGE]: 1,
              },
            })
          }
        />
      </div>
    </Style>
  );
}

export default Search;
