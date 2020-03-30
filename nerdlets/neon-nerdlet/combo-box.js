import React from 'react';
import PropTypes from 'prop-types';

import { Dropdown, DropdownItem, TextField } from 'nr1';

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

  valueChange(val) {
    const { onChange } = this.props;

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
            <Dropdown
              title="Select"
              // style={{ alignSelf: 'end', boxShadow: '0 1px 0 0 #e3e4e4' }}
            >
              {options.map((o, i) => (
                <DropdownItem onClick={e => this.valueChange(o)} key={i}>
                  {o}
                </DropdownItem>
              ))}
            </Dropdown>
          )}
          <TextField
            placeholder={placeholder || ''}
            value={value || ''}
            onChange={e => this.valueChange(e.target.value)}
          />
        </div>
      </div>
    );
  }
}
