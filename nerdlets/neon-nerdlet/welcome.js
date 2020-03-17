import React from 'react';
import PropTypes from 'prop-types';
import { Stack, StackItem, Button, Modal } from 'nr1';
import styles from './styles.scss';

export default class Welcome extends React.Component {
  static propTypes = {
    heading: PropTypes.string,
    description: PropTypes.string,
    buttonText: PropTypes.string,
    buttonOnClick: PropTypes.func,
    className: PropTypes.string,
    featuredImage: PropTypes.string,
    footer: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.handleButtonClick = this.handleButtonClick.bind(this);
  }

  handleButtonClick() {
    const { buttonOnClick } = this.props;
    if (buttonOnClick !== undefined) {
      return buttonOnClick();
    } else {
      console.log('You clicked the empty state button!');
    }
  }

  render() {
    const {
      heading,
      description,
      buttonText,
      buttonUrl,
      className,
      featuredImage,
      footer,
    } = this.props;

    return (
      <>
        <Stack
          className={styles['empty-state'] + ' ' + className}
          verticalType={Stack.VERTICAL_TYPE.CENTER}
          horizontalType={Stack.HORIZONTAL_TYPE.CENTER}
          directionType={Stack.DIRECTION_TYPE.VERTICAL}
          gapType={Stack.GAP_TYPE.NONE}
        >
          {featuredImage && (
            <StackItem>
              <img src={featuredImage} className={styles['empty-state-img']} />
              <img src={featuredImage} />
            </StackItem>
          )}
          <StackItem>
            <h4 className={styles['empty-h1-header']}>
              {heading || 'Welcome to Neon'}
            </h4>
          </StackItem>
          <StackItem className={description === '' ? styles.hidden : ''}>
            <p className={styles['empty-state-description']}>
              {description ||
                "If you are looking at an empty space with just a box and big plus sign, this means you don't have any boards. Before you create a new board, please review the dependencies in the Help menu. Once you've completed prerequisites, click the plus (+) icon to create a new board."}
            </p>
          </StackItem>
          {footer ? (
            <StackItem>{footer()}</StackItem>
          ) : (
            <StackItem className={buttonText === '' ? styles.hidden : ''}>
              <Button
                type={Button.TYPE.PRIMARY}
                onClick={this.handleButtonClick}
              >
                Help
              </Button>
            </StackItem>
          )}
        </Stack>
      </>
    );
  }
}
