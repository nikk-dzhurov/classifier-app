import React from 'react';
import {
	StyleSheet, View, Text, Image, Button,
	Linking, AppState, TouchableHighlight,
} from 'react-native';
import jpeg from 'jpeg-js';
import base64js from 'base64-js';
import RNFS from 'react-native-fs';
import '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';
import ImagePicker from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import * as mobilenet from '@tensorflow-models/mobilenet';

import { AppHeader } from './components/AppHeader';
import { LoadingScreen } from './components/LoadingScreen';
import { ClassificationResult } from './components/ClassificationResult';

export default class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			loading: 'backend',
			imageSource: null,
			pickerErrorMessage: null,
			appState: AppState.currentState,
		};

		this.model = null;
		this.pickerOptions = {
			title: 'Select Image',
			storageOptions: {
				skipBackup: true,
				path: 'images',
			},
		};
	}

	componentDidMount() {
		this._checkInitialUrl();

		Linking.addEventListener('url', this._handleOpenURL);
		AppState.addEventListener('change', this._handleAppStateChange);

		this.preload();
	}

	componentWillUnmount() {
		Linking.removeEventListener('url', this._handleOpenURL);
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_handleAppStateChange = nextAppState => {
		if (nextAppState !== this.state.appState) {
			this._checkInitialUrl();
		}

		this.setState({ appState: nextAppState });
	}

	_checkInitialUrl = async () => {
		const url = await Linking.getInitialURL();
		this._handleOpenURL(url);
	}

	_handleOpenURL = event => {
		console.log(event);
		if (event && event.url) {
			this.setState({
				result: null,
				imageSource: {uri: event.url},
			});
		}
	}

	preload = async () => {
		await tf.setBackend('rn-webgl');

		this.setState({loading: 'TFJS'});
		await this.loadTFJS();

		this.setState({loading: 'model'});
		this.model = await this.loadModel();

		this.setState({loading: 'warmup'});
		await this.model.classify(tf.zeros([1, 224, 224, 3]));

		this.setState({loading: false});
	}

	loadModel = () => mobilenet.load();

	loadTFJS = () => tf.ready();

	classify = async image => {
		if (this.state.loading) {
			return Promise.reject('App is loading');
		}

		const { imageSource } = this.state;
		const base64Data = await RNFS.readFile(imageSource.uri, 'base64');
		const rawData = base64js.toByteArray(base64Data);

		if (!rawData) {
			this.setState({
				pickerErrorMessage: 'Classification failed',
			});

			return;
		}

		const imageTensor = this.imageToTensor(rawData);
		const result = await this.model.classify(imageTensor);
		console.log(result);

		this.setState({result});
	}

	imageToTensor = rawData => {
		const { width, height, data } = jpeg.decode(rawData, true);
		const buffer = new Uint8Array(width * height * 3);
		let offset = 0; // offset into original data
		for (let i = 0; i < buffer.length; i += 3) {
			buffer[i] = data[offset];
			buffer[i + 1] = data[offset + 1];
			buffer[i + 2] = data[offset + 2];

			offset += 4;
		}

		return tf.tensor3d(buffer, [height, width, 3]);
	}

	showPicker = () => {
		this.setState({
			result: null,
			pickerErrorMessage: '',
			imageSource: null,
		});

		ImagePicker.showImagePicker(this.pickerOptions, async response => {
			if (response.didCancel) {
				this.setState({
					pickerErrorMessage: 'Image picker was canceled',
				});
			} else if (response.error) {
				this.setState({
					pickerErrorMessage: 'An error occured: ' + response.error,
				});
			} else {
				const source = await ImageResizer.createResizedImage(response.uri, 416, 416, 'JPEG', 100, 0)
					.catch(err => {
						console.log(err);

						return null;
					});

				if (!source) {
					this.setState({
						pickerErrorMessage: 'An error occured during resizing',
					});

					return;
				}

				this.setState({
					imageSource: source,
				});
			}
		});
	}

	render() {
		const { loading, imageSource, pickerErrorMessage, result } = this.state;

		let pickerMessage = 'Pick Image First';
		if (pickerErrorMessage) {
			pickerMessage = pickerErrorMessage + '\nPlease Pick Image Again';
		}

		if (loading) {
			return (
				<LoadingScreen text={loading} />
			);
		}

		return (
			<View style={styles.container}>
				<AppHeader />

				<TouchableHighlight onPress={this.showPicker}>
					<View style={styles.imageWrapper}>
						{ imageSource && !pickerErrorMessage ?
							<Image source={imageSource} style={styles.image} />
							:
							<Text style={styles.pickerMessage}>
								{pickerMessage}
							</Text>
						}
						<ClassificationResult resultArray={result} />
					</View>
				</TouchableHighlight>

				<View style={styles.buttonWrapper}>
					<Button
						onPress={this.showPicker}
						title="Pick Image"
						color="#0E91F4"
					/>
					<Button
						onPress={this.classify}
						title="Classify Image"
						color="#0E91F4"
						disabled={!imageSource}
					/>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F5FCFF',
		paddingBottom: 20,
	},
	pickerMessage: {
		fontSize: 25,
		textAlign: 'center',
	},
	image: {
		width: 350,
		height: 350,
		alignContent: 'center',
		resizeMode: 'contain',
	},
	imageWrapper: {
		height: 350,
		width: 350,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(225, 225, 225, 0.5)',
	},
	buttonWrapper: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		justifyContent: 'space-evenly',
	},
});
