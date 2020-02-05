import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export const AppHeader = () => (
	<View style={styles.container}>
		<Text style={styles.text}>
			Image Classifier
		</Text>
	</View>
);

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 20,
		alignSelf: 'stretch',
		height: 70,
		backgroundColor: '#1976D2',
		flexDirection: 'row',
		alignItems: 'center',
	},
	text: {
		fontSize: 25,
		color: '#fff',
	},
});
