import React from 'react';
import PropTypes from 'prop-types';

const ChevronDown = () => (
  <svg viewBox="0 0 16 16">
    <path d="M12.6 4.6L7.5 9.8 2.4 4.6l-.8.8 5.9 5.8 5.9-5.8z"></path>
  </svg>
);

const ChevronUp = () => (
  <svg viewBox="0 0 16 16">
    <path d="M7.5 3.8L1.6 9.6l.8.8 5.1-5.2 5.1 5.2.8-.8z"></path>
  </svg>
);

const X = () => (
  <svg viewBox="0 0 16 16">
    <path d="M13.4 2.4l-.8-.8-5.1 5.2-5.1-5.2-.8.8 5.2 5.1-5.2 5.1.8.8 5.1-5.2 5.1 5.2.8-.8-5.2-5.1z"></path>
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 16 16">
    <path d="M14.6 2.6L6 11.3 2.4 7.6l-.8.8L6 12.7l9.4-9.3z"></path>
  </svg>
);

export default class Select extends React.Component {
  static propTypes = {
    label: PropTypes.string,
    placeholder: PropTypes.string,
    values: PropTypes.array,
    multiple: PropTypes.any,
    options: PropTypes.array,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      values: props.values,
      focusedValue: -1,
      isFocused: false,
      isOpen: false,
      typed: '',
    };

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.onClick = this.onClick.bind(this);
    this.onDeleteOption = this.onDeleteOption.bind(this);
    this.onHoverOption = this.onHoverOption.bind(this);
    this.onClickOption = this.onClickOption.bind(this);

    this.renderOption = this.renderOption.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    const propVal = this.props.values;
    const prevPropVal = prevProps.values;

    const stateVal = this.state.values;
    const prevStateVal = prevState.values;

    if (
      !(
        prevPropVal.length === propVal.length &&
        prevPropVal.every((v, i) => v === propVal[i])
      )
    ) {
      this.setState({
        values: propVal,
      });
    }

    if (
      !(
        prevStateVal.length === stateVal.length &&
        prevStateVal.every((v, i) => v === stateVal[i])
      )
    )
      this.props.onChange(stateVal);
  }

  onFocus() {
    this.setState({
      isFocused: true,
    });
  }

  onBlur() {
    const { options, multiple } = this.props;

    this.setState(prevState => {
      const { values } = prevState;

      if (multiple) {
        return {
          focusedValue: -1,
          isFocused: false,
          isOpen: false,
        };
      } else {
        const value = values[0];

        let focusedValue = -1;

        if (value) {
          focusedValue = options.findIndex(option => option.value === value);
        }

        return {
          focusedValue,
          isFocused: false,
          isOpen: false,
        };
      }
    });
  }

  onKeyDown(e) {
    const { options, multiple } = this.props;
    const { isOpen } = this.state;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (multiple) {
            this.setState(prevState => {
              const { focusedValue } = prevState;

              if (focusedValue !== -1) {
                const [...values] = prevState.values;
                const value = options[focusedValue].value;
                const index = values.indexOf(value);

                if (index === -1) {
                  values.push(value);
                } else {
                  values.splice(index, 1);
                }

                return { values };
              }
            });
          }
        } else {
          this.setState({
            isOpen: true,
          });
        }
        break;
      case 'Escape':
      case 'Tab':
        if (isOpen) {
          e.preventDefault();
          this.setState({
            isOpen: false,
          });
        }
        break;
      case 'Enter':
        this.setState(prevState => ({
          isOpen: !prevState.isOpen,
        }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.setState(prevState => {
          let { focusedValue } = prevState;

          if (focusedValue < options.length - 1) {
            focusedValue++;

            if (multiple) {
              return {
                focusedValue,
              };
            } else {
              return {
                values: [options[focusedValue].value],
                focusedValue,
              };
            }
          }
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.setState(prevState => {
          let { focusedValue } = prevState;

          if (focusedValue > 0) {
            focusedValue--;

            if (multiple) {
              return {
                focusedValue,
              };
            } else {
              return {
                values: [options[focusedValue].value],
                focusedValue,
              };
            }
          }
        });
        break;
      default:
        if (/^[a-z0-9]$/i.test(e.key)) {
          const char = e.key;

          clearTimeout(this.timeout);
          this.timeout = setTimeout(() => {
            this.setState({
              typed: '',
            });
          }, 1000);

          this.setState(prevState => {
            const typed = prevState.typed + char;
            const re = new RegExp(`^${typed}`, 'i');
            const index = options.findIndex(option => re.test(option.value));

            if (index === -1) {
              return {
                typed,
              };
            }

            if (multiple) {
              return {
                focusedValue: index,
                typed,
              };
            } else {
              return {
                values: [options[index].value],
                focusedValue: index,
                typed,
              };
            }
          });
        }
        break;
    }
  }

  onClick() {
    this.setState(prevState => ({
      isOpen: !prevState.isOpen,
    }));
  }

  onDeleteOption(e) {
    const { value } = e.currentTarget.dataset;

    this.setState(prevState => {
      const [...values] = prevState.values;
      const index = values.indexOf(value);

      values.splice(index, 1);

      return { values };
    });
  }

  onHoverOption(e) {
    const { options } = this.props;

    const { value } = e.currentTarget.dataset;
    const index = options.findIndex(option => option.value === value);

    this.setState({
      focusedValue: index,
    });
  }

  onClickOption(e) {
    const { multiple } = this.props;

    const { value } = e.currentTarget.dataset;

    this.setState(prevState => {
      if (!multiple) {
        return {
          values: [value],
          isOpen: false,
        };
      }

      const [...values] = prevState.values;
      const index = values.indexOf(value);

      if (index === -1) {
        values.push(value);
      } else {
        values.splice(index, 1);
      }

      return { values };
    });
  }

  stopPropagation(e) {
    e.stopPropagation();
  }

  renderValues() {
    const { placeholder, multiple } = this.props;
    const { values } = this.state;

    if (values.length === 0) {
      return <div className="placeholder">{placeholder}</div>;
    }

    if (multiple) {
      return values.map(value => {
        return (
          <span
            key={value}
            onClick={this.stopPropagation}
            className="multiple value"
          >
            {value}
            <span
              data-value={value}
              onClick={this.onDeleteOption}
              className="delete"
            >
              <X />
            </span>
          </span>
        );
      });
    }

    return <div className="value">{values[0]}</div>;
  }

  renderOptions() {
    const { options } = this.props;
    const { isOpen } = this.state;

    if (!isOpen) {
      return null;
    }

    return <div className="options">{options.map(this.renderOption)}</div>;
  }

  renderOption(option, index) {
    const { multiple } = this.props;
    const { values, focusedValue } = this.state;

    const { value } = option;

    const selected = values.includes(value);

    let className = 'option';
    if (selected) className += ' selected';
    if (index === focusedValue) className += ' focused';

    return (
      <div
        key={value}
        data-value={value}
        className={className}
        onMouseOver={this.onHoverOption}
        onClick={this.onClickOption}
      >
        {multiple ? (
          <span className="checkbox">{selected ? <Check /> : null}</span>
        ) : null}
        {value}
      </div>
    );
  }

  render() {
    const { label } = this.props;
    const { isOpen } = this.state;

    return (
      <div
        className="select"
        tabIndex="0"
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        onKeyDown={this.onKeyDown}
      >
        <label className="label">{label}</label>
        <div className="selection" onClick={this.onClick}>
          {this.renderValues()}
          <span className="arrow">
            {isOpen ? <ChevronUp /> : <ChevronDown />}
          </span>
        </div>
        {this.renderOptions()}
      </div>
    );
  }
}
