import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';

export const LoadingScreen = ({text}) => (
	<View style={styles.container}>
		<View style={styles.loadingGroup}>
			<ActivityIndicator size={120} color="#0E91F4" />
			<Text style={styles.text}>Loading: {text}</Text>
		</View>
	</View>
);

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignContent: 'center',
	},
	text: {
		fontSize: 25,
		marginTop: 20,
		alignSelf: 'center',
	},
});
