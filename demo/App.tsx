import * as React from 'react'
import styled from 'styled-components/native'
import { StatusBar } from 'react-native'
import { Chart, HorizontalAxis, VerticalAxis, Line, Area, BoxTooltip } from 'react-native-responsive-linechart'

const App = () => {
  return (
    <Container>
      <StatusBar barStyle="dark-content" />
      <Chart
        style={{ height: 200, width: '100%', marginTop: 100 }}
        data={data1}
        xDomain={{ min: -2, max: 10 }}
        yDomain={{ min: -2, max: 20 }}
        padding={{ left: 20, top: 10, bottom: 10, right: 10 }}
      >
        <VerticalAxis tickValues={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]} theme={{ axis: { dx: 0 }, ticks: { dx: 0 } }} />
        <HorizontalAxis />
        <Line data={data1} tension={0.3} theme={{ stroke: { color: 'red', width: 4 } }} />
        <Area data={data1} tension={0.3} />
      </Chart>
      <Chart
        style={{ height: 200, width: '100%', marginTop: 100 }}
        data={data2}
        padding={{ left: 40, bottom: 20, right: 20, top: 20 }}
        xDomain={{ min: 0, max: 500 }}
        yDomain={{ min: -4, max: 20 }}
      >
        <VerticalAxis
          tickCount={10}
          theme={{
            axis: { stroke: { color: '#aaa', width: 2 } },
            ticks: { stroke: { color: '#aaa', width: 2 } },
            labels: { formatter: (v: number) => v.toFixed(2) },
          }}
        />
        <HorizontalAxis
          tickCount={9}
          theme={{
            axis: { stroke: { color: '#aaa', width: 2 } },
            ticks: { stroke: { color: '#aaa', width: 2 } },
            labels: { label: { rotation: 50 }, formatter: Math.round },
          }}
        />
        <Area />
        <Line theme={{ stroke: { color: 'red', width: 1 } }} tooltipComponent={<BoxTooltip theme={{ formatter: ({ y }) => y.toFixed(2) }} />} />
      </Chart>
    </Container>
  )
}

export default App

const Container = styled.View`
  width: 100%;
  flex: 1;
  padding: 24px;
  background-color: #fff;
`

const data1 = [
  { x: -2, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: 4 },
  { x: 1, y: 2 },
  { x: 5, y: 8 },
  { x: 6, y: 12 },
  { x: 7, y: 15 },
  { x: 8, y: 13 },
  { x: 9, y: 11.5 },
  { x: 10, y: 12 },
]

const data2 = new Array(500).fill(undefined).map((v, i) => ({ x: i, y: Math.random() * 10 }))
