type Geometry = {
  type: string;
  coordinates: number[]
}

type featureProperties = {
  [key: string]: string;
}

type Feature = {
  type: string;
  geometry: Geometry;
  properties: featureProperties
}

type itemObject = {
  [key: string]: any;
}

type GeoJSON = {
  type: string;
  features: Feature[]
}

const toGeoJson = (data: any) => {
  const geojson = {
    type: "FeatureCollection",
    features: []
  } as GeoJSON

  let skipped = 0

  for (const id in data) {
    const item = data[id] as itemObject

    // 必須項目の欠損や数値変換不可の場合はスキップして処理を続行
    if (!item['経度'] || !item['緯度'] || !item['スポット名']) {
      skipped++
      continue
    }

    const lngNum = Number(item['経度'])
    const latNum = Number(item['緯度'])
    if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) {
      skipped++
      continue
    }

    const feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lngNum, latNum]
      },
      properties: {_id: id}
    } as Feature

    for (let i = 0; i < Object.keys(item).length; i++) {
      const key = Object.keys(item)[i]
      feature.properties[key] = item[key]
    }

    geojson.features.push(feature)
  }

  // 1件も有効データがない場合でも空のGeoJSONを返す
  if (skipped > 0) {
    console.warn(`toGeoJson: skipped ${skipped} invalid item(s)`)
  }

  return geojson
}

export default toGeoJson;
