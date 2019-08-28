import React from 'react'
import PropTypes from 'prop-types'

export default class SegmentedControl extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    selected: PropTypes.string,
    options: PropTypes.array,
    onChange: PropTypes.func
  }

  constructor(props) {
    super(props)

    this.state = {
      selectedOption: (props.selected) ? props.selected : ''
    }

    this.optionChange = this.optionChange.bind(this)
  }

  optionChange(val) {
    const { title, onChange } = this.props
    this.setState({
      selectedOption: val
    })

    if (onChange) onChange(val, title)
  }

  render() {
    const { selectedOption } = this.state
    const { title, options } = this.props

    return (
      <ul class="segmented-control">
          {options.map(o => (
            <li class="segmented-control__item" key={o.name}>
              <input class="segmented-control__input" type="radio" name={title} id={'option-' + o.name} value={o.name} checked={selectedOption === o.name} />
              <label class="segmented-control__label" for={'option-' + o.name}  onClick={(e) => this.optionChange(o.name)}>{o.value}</label>
            </li>
          ))}
      </ul>
    )
  }
}
