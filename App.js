import React from 'react';
import {
	StyleSheet,
	View,
	Text,
	Image,
	Button,
	Linking,
	AppState,
	ActivityIndicator,
} from 'react-native';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { fetch } from '@tensorflow/tfjs-react-native';
import ImagePicker from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

const jpeg = require('jpeg-js');
const base64js = require('base64-js');
const RNFS = require('react-native-fs');

const LoadingScreen = ({text}) => (
	<View style={styles.loadingContainer}>
		<View style={styles.loadingGroup}>
			<ActivityIndicator size={120} color="#0E91F4" />
			<Text style={styles.loadingText}>Loading: {text}</Text>
		</View>
	</View>
);

export default class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			loading: 'backend',
			imageSource: null,
			pickerErrorMessage: null,
			appState: AppState.currentState,
		};

		this.pickerOptions = {
			title: 'Select Image',
			storageOptions: {
				skipBackup: true,
				path: 'images',
			},
		};

		this.model = null;
		this.classify = this.classify.bind(this);
		this.showPicker = this.showPicker.bind(this);
		this._handleOpenURL = this._handleOpenURL.bind(this);
		this._handleAppStateChange = this._handleAppStateChange.bind(this);
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

	_handleAppStateChange(nextAppState) {
		if (nextAppState !== this.state.appState) {
			this._checkInitialUrl();
		}

		this.setState({ appState: nextAppState });
	}

	_checkInitialUrl = async () => {
		const url = await Linking.getInitialURL();
		this._handleOpenURL(url);
	}

	_handleOpenURL(event) {
		console.log(event);
		if (event && event.url) {
			this.setState({
				result: null,
				imageSource: {uri: event.url},
			});
		}
	}

	async preload() {
		await tf.setBackend('rn-webgl');
		this.setState({loading: 'TFJS'});
		await this.loadTFJS();
		this.setState({loading: 'model'});
		this.model = await this.loadModel();
		this.setState({loading: 'warmup'});
		await this.model.classify(tf.zeros([1, 224, 224, 3]));

		this.setState({loading: false});
	}

	loadModel() {
		return mobilenet.load();
	}

	loadTFJS() {
		return tf.ready();
	}

	async classify(image) {
		if (this.state.loading) {
			return Promise.reject('App is loading');
		}

		const {imageSource} = this.state;
		let rawData = null;
		if (0) {
			const imageAssetPath = Image.resolveAssetSource(imageSource);
			const response = await fetch(imageAssetPath.uri, {}, { isBinary: true });
			rawData = await response.arrayBuffer();
		} else {
			const data = await RNFS.readFile(imageSource.uri, 'base64');
			rawData = base64js.toByteArray(data);
		}

		if (!rawData) {
			console.log('An error occured');

			return;
		}

		const imageTensor = this.imageToTensor(rawData);
		const result = await this.model.classify(imageTensor);
		console.log(result);

		this.setState({result});
	}

	imageToTensor(rawData) {
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

	showPicker() {
		ImagePicker.showImagePicker(this.pickerOptions, async (response) => {
			if (response.didCancel) {
				this.setState({
					pickerErrorMessage: 'Image picker was canceled.',
				});
			} else if (response.error) {
				this.setState({
					pickerErrorMessage: 'An error occured: ' + response.error,
				});
			} else {
				const source = await ImageResizer.createResizedImage(response.uri, 400, 400, 'JPEG', 100, 0).catch((err) => {
					console.log(err);

					return null;
				});
				if (!source) {
					console.log('resizing error');
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
		let imgMsg = 'Pick Image First';
		if (this.state.pickerErrorMessage) {
			imgMsg = this.state.pickerErrorMessage + '\nPlease Pick Image Again';
		}

		if (this.state.loading) {
			return <LoadingScreen text={this.state.loading} />;
		}

		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>
						Image Classifier
					</Text>
				</View>

				<View style={styles.imageHolder}>
					{ this.state.imageSource ?
						<Image source={this.state.imageSource} style={styles.selectedImage} />
						:
						<Text style={styles.imageTitle}>
							{imgMsg}
						</Text>
					}
					{this.state.result && this.state.result.length > 0 && (
						<View style={styles.resultsContainer}>
							{this.state.result.sort((a, b) => b.probability - a.probability).slice(0, 3).map(el => (
								<Text key={el.className} style={styles.classData}>
									{`${el.className}: ${(el.probability * 100).toFixed(1)} %`}
								</Text>
							))}
						</View>
					)}
				</View>

				<View style={styles.buttonHolder}>
					<Button onPress={this.showPicker} title="Pick Image" color="#0E91F4" />
					<Button onPress={this.classify} title="Classify Image" color="#0E91F4" disabled={!this.state.imageSource} />
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignContent: 'center',
	},
	container: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F5FCFF',
		paddingBottom: 20,
	},
	header: {
		paddingHorizontal: 20,
		alignSelf: 'stretch',
		height: 70,
		backgroundColor: '#1976D2',
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		color: '#fff',
		fontSize: 25,
	},
	imageTitle: {
		fontSize: 25,
		textAlign: 'center',
	},
	resultsContainer: {
		width: 340,
		height: 120,
		backgroundColor: 'rgba(225, 225, 225, 0.5)',
		position: 'absolute',
		alignContent: 'center',
		justifyContent: 'center',
	},
	classData: {
		fontSize: 16,
		alignSelf: 'center',
	},
	selectedImage: {
		width: 350,
		height: 350,
		alignContent: 'center',
		resizeMode: 'contain',
	},
	imageHolder: {
		height: 350,
		width: 350,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(225, 225, 225, 0.5)',
	},
	buttonHolder: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		justifyContent: 'space-evenly',
	},
	loadingText: {
		fontSize: 25,
		marginTop: 20,
		alignSelf: 'center',
	},
});
