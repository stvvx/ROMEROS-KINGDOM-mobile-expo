import React, { useEffect, useState } from 'react'
import { ScrollView, View, Text, Dimensions, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit'
import axios from 'axios'
import Constants from 'expo-constants'

let API_URL =
	process.env.NGROK_URL ||
	process.env.EXPO_PUBLIC_API_URL ||
	'http://localhost:4000/api/v1'

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost = manifest?.debuggerHost ? manifest.debuggerHost.split(':')[0] : null

if (debuggerHost && debuggerHost !== 'localhost') {
	API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
	API_URL = API_URL.replace('localhost', '10.0.2.2')
}

const screenWidth = Dimensions.get('window').width - 32

const chartConfig = {
	backgroundGradientFrom: '#ffffff',
	backgroundGradientTo: '#ffffff',
	decimalPlaces: 0,
	color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`,
	labelColor: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
	style: { borderRadius: 8 },
}

const Dashboard: React.FC = () => {
	const [loading, setLoading] = useState(true)
	const [revenue, setRevenue] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
	const [productSales, setProductSales] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
	const [categories, setCategories] = useState<{ category: string; count: number }[]>([])
	const [pieData, setPieData] = useState<any[]>([])

	useEffect(() => {
		let mounted = true
		const fetchAll = async () => {
			try {
				const [monthsRes, prodRes, custRes, catRes] = await Promise.all([
					axios.get(`${API_URL}/admin/sales-per-month`),
					axios.get(`${API_URL}/admin/product-sales`),
					axios.get(`${API_URL}/admin/customer-sales`),
					axios.get(`${API_URL}/products/categories`),
				])

				if (!mounted) return

				const months = monthsRes.data.salesPerMonth ?? []
				setRevenue({ labels: months.map((m: any) => m.month), data: months.map((m: any) => m.total) })

				const totalPercentage = prodRes.data.totalPercentage ?? []
				const barLabels = totalPercentage.map((p: any) => (p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name))
				const barData = totalPercentage.map((p: any) => Number(p.percent))
				setProductSales({ labels: barLabels, data: barData })

				const customers = custRes.data.customerSales ?? []
				const topCustomers = customers.slice(0, 5).map((c: any, i: number) => ({
					name: c.userDetails?.name || `User ${i + 1}`,
					population: Number(c.total),
					color: ['#4caf50', '#ffca28', '#f44336', '#42a5f5', '#9c27b0'][i % 5],
					legendFontColor: '#333',
					legendFontSize: 12,
				}))
				setPieData(topCustomers)

				const cats = catRes.data.categories ?? []
				// Normalize category format if it's returned as string or object
				const normalized = cats.map((c: any) => (typeof c === 'string' ? { category: c, count: 1 } : { category: c.category || String(c._id), count: c.count || 1 }))
				setCategories(normalized)
			} catch (err) {
				console.warn('Dashboard fetch error', err && err.message ? err.message : err)
			} finally {
				setLoading(false)
			}
		}

		fetchAll()

		return () => {
			mounted = false
		}
	}, [])

	if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}><ActivityIndicator size="large" /></View>

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>Admin Dashboard</Text>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Monthly Revenue</Text>
				{revenue.labels.length ? (
					<LineChart data={{ labels: revenue.labels, datasets: [{ data: revenue.data }] }} width={screenWidth} height={220} chartConfig={chartConfig} bezier style={styles.chart} />
				) : (
					<Text>No revenue data</Text>
				)}
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Top Product Sales (by %)</Text>
				{productSales.labels.length ? (
					<BarChart data={{ labels: productSales.labels, datasets: [{ data: productSales.data }] }} width={screenWidth} height={240} chartConfig={chartConfig} fromZero showValuesOnTopOfBars style={styles.chart} />
				) : (
					<Text>No product sales data</Text>
				)}
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Top Customers (by spend)</Text>
				{pieData.length ? (
					<PieChart data={pieData} width={screenWidth} height={220} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute chartConfig={chartConfig} style={styles.chart} />
				) : (
					<Text>No customer data</Text>
				)}
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>Categories ({categories.length})</Text>
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
					{categories.map((c) => (
						<View key={c.category} style={{ padding: 8, backgroundColor: '#f2f2f2', borderRadius: 6, marginRight: 8, marginBottom: 8 }}>
							<Text>{c.category} ({c.count})</Text>
						</View>
					))}
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: { padding: 16, paddingBottom: 40 },
	title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
	card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
	cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
	chart: { borderRadius: 8 },
})

export default Dashboard

