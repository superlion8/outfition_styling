import { WardrobeItem } from "./types";

export const MOCK_IMAGES = {
  TROUSERS: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_pdUeDbiAKUqSJSrgKtKuZX9BboZHcNka6ccspLxf3sC-WFhNjCGxzjTfW0x03AQFFq9jagFGx0gzgR3fflEPvs9nb08uiLfW1YW0v-YlPACZgfNwch4aEdmWLP3r5ZDVgfqATBRvE0S6dJ_t4yI-3DsXyBWchqs7Fbitm_odQJXNcPGqEaoN8TMn_zRpGDXaKHD4cRnhj9ti-UMG83ToSle2KTj9nXV233cTS3QUU-zArWmG15GaSwv9-fU1bkZMmpFscV0aKe0',
  SKIRT: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACVz3nRk5IXy1Wk2uATCu1xLOU9l9Oz5Vnxo0SJ5dWqyW3JoNDBnLhHOyAzOhxV7hMNU19IB7QeMWCZpKM3rJoHOjfEbcAO08unUgIjGRQurInop6M32uoMbN0Iis7QKeYYwxUHaihyrO2twOO781gE0Zj4A57j8Yw-7rFy45Ugt0phAyknNF1vdNSeY8gnTRouz-zlFWcIU_vgIbdtjunKc8h9P9jGaWR98dqIBV6i0Lp5QKzZAUdf1gtjTXiP094las2V71m6ZM',
  BAG: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHpx76al1xxod6Swwum9YjazKl3NjvUBtnengLtMrhZDksCb7taj7Mr7tXFEgR1qEbf89jx8FiHFL-Z_pQxBhtj8jRYinFTmRmTM-mRD-ZvFsKIX1LZ2x1Ye9d-oP6j8js32GmtOOL33yOApsYMfcZNZiiUR_KMiXx66R435WaKdYp1wmNZGTAasf4ZX-jNguU-qmgDUFMR9jVED0OMQGB5H-x0ujv9Cd9_AWZ6EAk07wydWfRc5gSg8YCSt5qBZ5Rl1-y9gXdHHQ',
  AVATAR: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnO9iLQVskSRbmrGHpdsseA1vXHv-5QucAnxz1Tbk38g3cO3H1_bitkQdA1DxoSV4yzVlp6ctR4teGB4c3nTvXXiuhnvBtX3qQRtcHy5kdbUZw7rNcZJFOYoVeSOsc5UtCBjjqko8RXW2-vo3YQ6LrVeNX1SHCT_oROxTkZ7AldEoGK5oTMlyARZroJevTwZY6dCqMnShUQEvsULDW6SU8ljrEdtcvYAvxEZYu6vqJxsMAo6kypvEHDBgicNLohlVJ2TyQ2ChCbqA'
};

export const INITIAL_ITEMS: WardrobeItem[] = [
  { id: '1', category: 'bottoms', imageUrl: MOCK_IMAGES.TROUSERS, name: 'Black tailored trousers' },
  { id: '2', category: 'bottoms', imageUrl: MOCK_IMAGES.SKIRT, name: 'Denim skirt' },
  { id: '3', category: 'accessories', imageUrl: MOCK_IMAGES.BAG, name: 'Leather handbag' },
];

export const MODELS = [
  { id: '1', name: 'Sora', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2864&auto=format&fit=crop' },
  { id: '2', name: 'Kaito', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=2787&auto=format&fit=crop' },
  { id: '3', name: 'Elena', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2550&auto=format&fit=crop' },
  { id: '4', name: 'Marcus', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2787&auto=format&fit=crop' },
];