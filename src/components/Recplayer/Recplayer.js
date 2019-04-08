import React from 'react';
import PropTypes from 'prop-types';

const RecPlayer =
  typeof document !== 'undefined' && require('recplayer-react').default; // eslint-disable-line global-require

class Recplayer extends React.Component {
  static propTypes = {
    rec: PropTypes.string,
    lev: PropTypes.string.isRequired,
    width: PropTypes.string,
    height: PropTypes.string,
    zoom: PropTypes.number,
    controls: PropTypes.bool,
    imageUrl: PropTypes.string,
    autoPlay: PropTypes.oneOf(['if-visible', 'yes', 'no']),
  };

  static defaultProps = {
    rec: null,
    width: 'auto',
    height: 'auto',
    zoom: 0.7,
    controls: true,
    imageUrl: 'https://elma.online/recplayer',
    autoPlay: 'if-visible',
  };

  render() {
    const {
      rec,
      lev,
      width,
      height,
      zoom,
      controls,
      imageUrl,
      autoPlay,
    } = this.props;

    let shouldAutoPlay = false;

    if (autoPlay === 'if-visible') {
      const { visibilityState } = document;

      if (visibilityState === 'visible') {
        shouldAutoPlay = true;
      }
    } else if (autoPlay === 'no') {
      shouldAutoPlay = false;
    } else if (autoPlay === 'yes') {
      shouldAutoPlay = true;
    }

    return (
      <React.Fragment>
        {RecPlayer && lev ? (
          <RecPlayer
            recUrl={rec}
            levUrl={lev}
            width={width}
            height={height}
            zoom={zoom}
            controls={controls}
            imageUrl={imageUrl}
            autoPlay={shouldAutoPlay}
          />
        ) : (
          <span>Loading..</span>
        )}
      </React.Fragment>
    );
  }
}

export default Recplayer;
