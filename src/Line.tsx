import deepmerge from 'deepmerge'
import * as React from 'react'
import { G, Path, Rect, ForeignObject } from 'react-native-svg'

import ChartContext from './ChartContext'
import { adjustPointsForThickStroke, calculateTooltipIndex } from './Line.utils'
import { ChartDataPoint, Smoothing, Stroke, Shape, IconPointDataPoint, XYValue } from './types'
import { scalePointsToDimensions, svgPath } from './utils'



type Props = {
  /** Theme for the line */
  theme?: {
    stroke?: Stroke
    scatter?: {
      default?: Shape
      selected?: Shape
    }
  }
  smoothing?: Smoothing
  /** Only works in combination with smoothing='bezier'. Value between 0 and 1. */
  tension?: number
  /** Component to render tooltips. An example component is included: <Tooltip />. */
  tooltipComponent?: JSX.Element
  /** Callback method that fires when a tooltip is displayed for a data point. */
  onTooltipSelect?: (value: ChartDataPoint, index: number) => void
  /** Callback method that fires when the user stopped touching the chart. */
  onTooltipSelectEnd?: () => void
  /** Set to true if the tooltip should be hidden immediately when the user stops dragging the chart. */
  hideTooltipOnDragEnd?: boolean
  /** Defines a period in ms after which the tooltip should hide */
  hideTooltipAfter?: number
  /** Initial index for the tooltip. The tooltip will be immediately visible at this index on first render, without requiring user interaction. */
  initialTooltipIndex?: number
  /** Data for the chart. Overrides optional data provided in `<Chart />`. */
  data?: ChartDataPoint[]
  /** to show all tooltips at once */
  alwaysShowAllToolTips?: boolean
  /** any svg icon component to replace scatter points  */
  pointIconForPoint?: IconPointDataPoint[]
  /** y value as a flag to skip the point  */
  ySkipPoint?: number
}

export type LineHandle = {
  setTooltipIndex: (index: number | undefined) => void
}

const Line = React.forwardRef<LineHandle, Props>(function Line(props, ref) {
  const { data: contextData, dimensions, viewportDomain, viewportOrigin, lastTouch } = React.useContext(ChartContext)
  const [tooltipIndex, setTooltipIndex] = React.useState<number | undefined>(props.initialTooltipIndex)

  const {
    theme: { stroke, scatter },
    tooltipComponent,
    data = contextData,
    tension,
    smoothing,
    onTooltipSelect,
    hideTooltipOnDragEnd,
    hideTooltipAfter,
    pointIconForPoint,
    ySkipPoint,
    onTooltipSelectEnd = () => {},
  } = deepmerge(defaultProps, props)

  if (!dimensions) {
    return null
  }

  React.useImperativeHandle(ref, () => ({
    setTooltipIndex: (index: number | undefined) => {
      if (typeof index === 'number' && (index < 0 || index >= data.length)) {
        throw new Error(`Range out of bounds. Tried to set tooltip index to ${index} but there are only ${data.length} data points.`)
      }
      setTooltipIndex(index)
    },
  }))

  React.useEffect(() => {
    if (props.initialTooltipIndex !== undefined && !lastTouch) {
      setTooltipIndex(props.initialTooltipIndex)
    }
  }, [props.initialTooltipIndex])

  React.useEffect(() => {
    const scaledPoints = scalePointsToDimensions(data, viewportDomain, dimensions)
    const newIndex = calculateTooltipIndex(scaledPoints, lastTouch?.position)

    let tooltipTimer: NodeJS.Timeout

    if (lastTouch?.type === 'panEnd') {
      if (hideTooltipOnDragEnd && Math.abs(lastTouch?.translation?.x) > 5) {
        setTooltipIndex(undefined)
      }
      // Hide tooltip after specified time
      else if (typeof hideTooltipAfter === 'number') {
        tooltipTimer = setTimeout(() => setTooltipIndex(undefined), hideTooltipAfter)
      }
      onTooltipSelectEnd()
    } else if (newIndex !== tooltipIndex && lastTouch) {
      // Hide tooltip after specified time
      if (typeof hideTooltipAfter === 'number') {
        tooltipTimer = setTimeout(() => setTooltipIndex(undefined), hideTooltipAfter)
      }
      // Necessary for Android because pan is called even when finger is not actually panning.
      // If we don't check for this, we have interference with the tap handler
      if (lastTouch?.type !== 'pan' || Math.abs(lastTouch?.translation?.x) > 5) {
        setTooltipIndex(newIndex)
      }
      if (typeof onTooltipSelect === 'function' && typeof newIndex === 'number' && data.length > newIndex) {
        onTooltipSelect(data[newIndex], newIndex)
      }
    } else if (newIndex === tooltipIndex && lastTouch?.type === 'tap') {
      setTooltipIndex(undefined)
    }

    return () => {
      clearTimeout(tooltipTimer)
    }
  }, [lastTouch, hideTooltipAfter])

  const scaledPoints = scalePointsToDimensions(data, viewportDomain, dimensions)
  const points = adjustPointsForThickStroke(scaledPoints, stroke)


  let lastSliceStartedArrayInd = -1;
  let pointArrs:any[] = [];

  if(ySkipPoint !== undefined && ySkipPoint !== null){
    data.map((val,index)=>{
      if(index !== points.length - 1) {
        if(val.y === ySkipPoint){
         if(index - lastSliceStartedArrayInd > 1)
         {
          pointArrs.push(points.slice( lastSliceStartedArrayInd + 1, index));
         }
         lastSliceStartedArrayInd = index;
        }
      }else{
        if(val.y === ySkipPoint){
          if(index - lastSliceStartedArrayInd > 1)
          {
            pointArrs.push(points.slice(lastSliceStartedArrayInd + 1, index));
          }else{
            pointArrs.push(points.slice(lastSliceStartedArrayInd, index));
          }
          
        }else{
          if(data.length > 1){
            pointArrs.push(points.slice(lastSliceStartedArrayInd + 1, index + 1));
          }
        }
      }
    })
  }

  let path = null;
  let paths:any[] = [];
  
  if(pointArrs.length > 0){
    pointArrs.forEach(element => {
      if(element.length > 0){
        path = svgPath(element, smoothing, tension)
        paths.push(path);
      }
    });
  }else{
    path = svgPath(points, smoothing, tension)
  }

  let tooltipsAll:any[] = []
  if(tooltipComponent){
    data.map((val,ind)=>{
      if(ySkipPoint !== undefined && ySkipPoint !== null){
        if(val.y === ySkipPoint){
          return;
        }
      }
      tooltipsAll.push(React.cloneElement(tooltipComponent, {key: ind, value: val, position: scaledPoints[ind] }))
    })
  }

  return (
    <React.Fragment>
      <G translateX={viewportOrigin.x} translateY={viewportOrigin.y}>
        
        {paths.length > 0 ? paths.map((path,index)=>{
          return  <Path
          key={index}
          d={path}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={stroke.dashArray.length > 0 ? stroke.dashArray.join(',') : undefined}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeOpacity={stroke.opacity}
          mask="url(#Mask)"
        />
        }) : (<Path
          d={path}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={stroke.dashArray.length > 0 ? stroke.dashArray.join(',') : undefined}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeOpacity={stroke.opacity}
          mask="url(#Mask)"
        />)}
       
        {points.map((p, i) => {
          const shape = i === tooltipIndex ? deepmerge(scatter.default, scatter.selected) : scatter.default
          // Don't render if point falls out of viewport
          if (data[i].x < viewportDomain.x.min || data[i].x > viewportDomain.x.max || data[i].y < viewportDomain.y.min || data[i].y > viewportDomain.y.max) {
            return null
          }
          // Don't render if shape has no dimensions
          if (shape.width === 0 || shape.height === 0) {
            return null
          }

          
          if(pointIconForPoint && pointIconForPoint[i] && pointIconForPoint[i].x === data[i].x && pointIconForPoint[i].y === data[i].y && pointIconForPoint[i].icon !== undefined ){
            if(pointIconForPoint[i].icon === null){
              return (
                <ForeignObject x={p.x - 10 + shape.dx} y={p.y - 10 - shape.dy} key={JSON.stringify(p)+ '-' + i}/>
              )
            }else{
              return (
                <ForeignObject x={p.x - 10 + shape.dx} y={p.y - 10 - shape.dy} key={JSON.stringify(p)+ '-' + i}>
                  { React.cloneElement(pointIconForPoint[i].icon,{width: 20, height: 20})}
                </ForeignObject>
              )
            }
            
          }else if(ySkipPoint !== undefined && ySkipPoint !== null && data[i].y == ySkipPoint){
            return(
              <Rect
                key={JSON.stringify(p) + '-' + i}
                x={p.x - shape.width / 2 + shape.dx}
                y={p.y - shape.height / 2 - shape.dy}
                rx={shape.rx}
                fill={shape.color}
                opacity={0.0}
                height={shape.height}
                width={shape.width}
              />
            )
          }else{
            return(
              <Rect
                key={JSON.stringify(p) + '-' + i}
                x={p.x - shape.width / 2 + shape.dx}
                y={p.y - shape.height / 2 - shape.dy}
                rx={shape.rx}
                fill={shape.color}
                opacity={shape.opacity}
                height={shape.height}
                width={shape.width}
                strokeWidth={shape.lineWidth}
                stroke={shape.lineColor}
              />
            )
          }
        })}
      </G>
      {(props.alwaysShowAllToolTips === undefined || !props.alwaysShowAllToolTips) && tooltipIndex !== undefined &&
        tooltipComponent && data[tooltipIndex].y !== ySkipPoint &&
        React.cloneElement(tooltipComponent, { value: data[tooltipIndex], position: scaledPoints[tooltipIndex] })}

       {tooltipComponent && props.alwaysShowAllToolTips !== undefined && props.alwaysShowAllToolTips && tooltipsAll}
    </React.Fragment>
  )
})

export { Line }

const defaultProps = {
  theme: {
    stroke: {
      color: 'black',
      width: 1,
      opacity: 1,
      dashArray: [],
    },
    scatter: {
      default: {
        width: 0,
        height: 0,
        dx: 0,
        dy: 0,
        rx: 0,
        color: 'black',
        lineWidth: 0,
        lineColor: 'black',
      },
      selected: {},
    },
  },
  tension: 0.3,
  smoothing: 'none',
}
