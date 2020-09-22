import React from 'react';
import PropTypes from 'prop-types';

import { TextField } from 'nr1';

export default class ComboBox extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    placeholder: PropTypes.string,
    value: PropTypes.string,
    options: PropTypes.array,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.valueChange = this.valueChange.bind(this);

    this.state = {
      value: props.value ? props.value : '',
    };
  }

  valueChange(e) {
    const { onChange } = this.props;

    let val = e.target.value;
    val = val === 'Select' ? '' : val;

    this.setState(
      {
        value: val,
      },
      () => {
        if (onChange) onChange(val);
      }
    );
  }

  render() {
    const { value } = this.state;
    const { title, placeholder, options } = this.props;

    const selectStyle = {
      minWidth: '128px',
      minHeight: '33px',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      padding: '6.5px 8px',
      fontSize: '14px',
      position: 'relative',
      lineHeight: '19px',
      border: 'none',
      boxShadow:
        'inset 0 0 0 1px #d5d7d7, inset 0px 3px 0px rgba(0, 0, 0, 0.02)',
      backgroundPosition: 'right 8px top 56%',
      borderRadius: '3px',
      backgroundColor: '#fff',
      transition: '0.075s all ease-in-out',
      left: 0,
    };

    return (
      <div>
        {title && (
          <div
            style={{
              fontSize: '11px',
              lineHeight: '16px',
              letterSpacing: '.2px',
              paddingTop: '3px',
              paddingBottom: '5px',
              textTransform: 'uppercase',
              color: '#8e9494',
            }}
          >
            {title}
          </div>
        )}
        <div
          style={
            options ? { display: 'grid', gridTemplateColumns: '1fr 9fr' } : {}
          }
        >
          {options && (
            <div>
              <select
                onChange={e => this.valueChange(e)}
                style={{ alignSelf: 'end', ...selectStyle }}
              >
                <option>Select</option>
                {options.map((o, i) => (
                  <option value={o} key={i}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <TextField
              placeholder={placeholder || ''}
              value={value || ''}
              onChange={e => this.valueChange(e)}
            />
          </div>
        </div>
      </div>
    );
  }
}
