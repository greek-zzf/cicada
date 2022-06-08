import { request } from '.';

function getSelfMusicbillList() {
  return request<
    {
      id: string;
      cover: string;
      name: string;
      public: 0 | 1;
      order: number;
      orderTimestamp: number;
      createTimestamp: number;
    }[]
  >({
    path: '/api/self_musicbill_list',
    withToken: true,
  });
}

export default getSelfMusicbillList;