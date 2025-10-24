const setCluster = (map: any) => {
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'shops',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': [
        'step', ['get', 'point_count'],
        16, 10, 20, 50, 26, 100, 32
      ],
      'circle-color': [
        'step', ['get', 'point_count'],
        '#3CB371', 10, '#FFD54F', 50, '#FF8A65', 100, '#E53935'
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.9,
    },
  })

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'shops',
    filter: ['has', 'point_count'],
    paint: {
      'text-color': '#222222',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 2,
    },
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
      'text-font': ['Noto Sans Regular'],
    },
  })

  map.on('click', 'clusters', (e: any) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    const clusterId = features[0].properties.cluster_id
    map.getSource('shops').getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
      if (err)
        return

      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom,
      })
    })
  })

  map.on('mouseenter', 'clusters', function () {
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'clusters', function () {
    map.getCanvas().style.cursor = ''
  })
}

export default setCluster;
