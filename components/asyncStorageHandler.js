import {fromByteArray, toByteArray} from 'base64-js';
import AsyncStorage from '@react-native-community/async-storage';

const PATH_SEPARATOR = '/';
const PATH_PREFIX = 'tensorflowjs_models';
const INFO_SUFFIX = 'info';
const MODEL_SUFFIX = 'model_without_weight';
const WEIGHT_DATA_SUFFIX = 'weight_data';
function getModelKeys(path) {
	return {
		info: [PATH_PREFIX, path, INFO_SUFFIX].join(PATH_SEPARATOR),
		modelArtifactsWithoutWeights: [PATH_PREFIX, path, MODEL_SUFFIX].join(PATH_SEPARATOR),
		weightData: [PATH_PREFIX, path, WEIGHT_DATA_SUFFIX].join(PATH_SEPARATOR),
	};
}

function getModelArtifactsInfoForJSON(modelArtifacts) {
	if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
		throw new Error('Expected JSON model topology, received ArrayBuffer.');
	}

	return {
		dateSaved: new Date(),
		modelTopologyType: 'JSON',
		weightDataBytes: modelArtifacts.weightData == null ?
			0 :
			modelArtifacts.weightData.byteLength,
	};
}

class AsyncStorageHandler {
	constructor(modelPath) {
		this.parts = 100;
		this.modelPath = modelPath;
		if (modelPath == null || !modelPath) {
			throw new Error('modelPath must not be null, undefined or empty.');
		}

		this.keys = getModelKeys(this.modelPath);
	}

	async save(modelArtifacts) {
		if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
			throw new Error('AsyncStorageHandler.save() does not support saving model topology ' +
			'in binary format.');
		}

		const modelArtifactsInfo = getModelArtifactsInfoForJSON(modelArtifacts);
		const { weightData, ...modelArtifactsWithoutWeights } = modelArtifacts;
		const weightsString = fromByteArray(new Uint8Array(weightData));
		try {
			await AsyncStorage.setItem(this.keys.info, JSON.stringify(modelArtifactsInfo));
			await AsyncStorage.setItem(this.keys.modelArtifactsWithoutWeights, JSON.stringify(modelArtifactsWithoutWeights));
			const blockSize = Math.floor(weightsString.length / this.parts);
			for (let i = 0; i < (this.parts + 1); i++) {
				const start = i * blockSize;
				const part = weightsString.substr(start, blockSize);
				if (part.length > 0) {
					await AsyncStorage.setItem(this.keys.weightData + '_' + i, part);
				} else {
					AsyncStorage.removeItem(this.keys.weightData + '_' + i);
				}
			}

			return { modelArtifactsInfo };
		} catch (err) {
			AsyncStorage.removeItem(this.keys.info);
			for (let i = 0; i < this.parts + 1; i++) {
				AsyncStorage.removeItem(this.keys.weightData + '_' + i);
			}

			AsyncStorage.removeItem(this.keys.modelArtifactsWithoutWeights);
			throw new Error(`Failed to save model '${this.modelPath}' to AsyncStorage.
			Error info ${err}`);
		}
	}

	async load() {
		const info = JSON.parse(await AsyncStorage.getItem(this.keys.info));
		if (info == null) {
			throw new Error(`In local storage, there is no model with name '${this.modelPath}'`);
		}

		const modelArtifacts = JSON.parse(await AsyncStorage.getItem(this.keys.modelArtifactsWithoutWeights));

		let weightDataBase64 = '';
		for (let i = 0; i < (this.parts + 1); i++) {
			const part = await AsyncStorage.getItem(this.keys.weightData + '_' + i);
			if (part) {
				weightDataBase64 += part;
			}
		}

		if (!weightDataBase64) {
			throw new Error(`In local storage, the binary weight values of model '${this.modelPath}' are missing.`);
		}

		modelArtifacts.weightData = toByteArray(weightDataBase64).buffer;

		return modelArtifacts;
	}
}

export const asyncStorageHandler = (modelPath) => new AsyncStorageHandler(modelPath);
