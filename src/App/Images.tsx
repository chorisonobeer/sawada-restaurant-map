import { useEffect, useState } from 'react'
import { ImageList, ImageListItem } from '@material-ui/core'
import Shop from './Shop'
import './Images.scss'

type Props = {
  data: Pwamap.ShopData[];
}

const Content = (props: Props) => {

  const { data } = props;
  const [validImageList, setValidImageList ] = useState<JSX.Element[]>([]);
  const [shop, setShop] = useState<Pwamap.ShopData | undefined>()

  const popupHandler = (shop: Pwamap.ShopData) => {
    if (shop) {
      setShop(shop)
    }
  }

  const closeHandler = () => {
    setShop(undefined)
  }

  useEffect(() => {

    const imageKeys = ['画像', '画像2', '画像3', '画像4', '画像5'];
    const items: JSX.Element[] = [];

    for (let i = 0; i < data.length; i++) {
      const shop = data[i];

      imageKeys.forEach((key, idx) => {
        const raw = (shop[key] || '').toString().trim();
        if (!raw) return;
        const src = (raw.startsWith('http') || raw.startsWith('/')) ? raw : `/${raw}`;

        items.push(
          <ImageListItem
            key={`${i}-${key}`}
            className="mui-image-list-item"
          >
            <img
              src={src}
              alt={`${shop['スポット名'] || ''}の写真${idx + 1}`}
              loading="lazy"
              decoding="async"
              width={400}
              height={300}
              onClick={() => popupHandler(shop)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).parentElement?.remove();
              }}
            />
          </ImageListItem>
        );
      });
    }

    setValidImageList(items);

  }, [data])

  return (
    <>
      <div className="head"></div>
      <div className="images">
        <div className="container">
          <ImageList id="mui-image-list" sx={{ width: "100%", height: "100%" }} cols={2} rowHeight={164}>
            {validImageList}
          </ImageList>
          {shop ?
            <Shop shop={shop} close={closeHandler} />
            :
            <></>
          }
        </div>
      </div>
    </>
  );
};

export default Content;
