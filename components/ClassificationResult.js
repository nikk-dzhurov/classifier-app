import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export const ClassificationResult = ({resultArray}) => {
	if (!resultArray || resultArray.length === 0) {
		return null;
	}

	return (
		<View style={styles.container}>
			{resultArray.sort((a, b) => b.probability - a.probability).slice(0, 3).map(res => (
				<Text key={res.className} style={styles.text}>
					{`${res.className}: ${(res.probability * 100).toFixed(1)} %`}
				</Text>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: 350,
		height: 120,
		backgroundColor: 'rgba(225, 225, 225, 0.5)',
		position: 'absolute',
		alignContent: 'center',
		justifyContent: 'center',
	},
	text: {
		fontSize: 16,
		alignSelf: 'center',
	},
});
