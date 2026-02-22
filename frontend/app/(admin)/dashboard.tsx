import React, { useEffect, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit'
import { useRouter, usePathname } from 'expo-router'
import axios from 'axios'
import Constants from 'expo-constants'

// ─────────────────────────────────────────────────────────────
// API CONFIG
// ─────────────────────────────────────────────────────────────

let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any =
  (Constants as any).manifest || (Constants as any).expoConfig

const debuggerHost = manifest?.debuggerHost
  ? manifest.debuggerHost.split(':')[0]
  : null

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

// ─────────────────────────────────────────────────────────────

const screenWidth = Dimensions.get('window').width - 32

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
  style: { borderRadius: 8 },
}

// ─────────────────────────────────────────────────────────────
// ADMIN HEADER
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/(admin)/dashboard' },
  { label: 'Products', path: '/(admin)/products' },
  { label: 'Categories', path: '/(admin)/categories' },
  { label: 'Users', path: '/(admin)/users' },
  { label: 'Reviews', path: '/(admin)/review' },
]

const AdminHeader: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={headerStyles.wrapper}>
      <Text style={headerStyles.brand}>⚙️ Admin</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={headerStyles.navRow}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path

          return (
            <TouchableOpacity
              key={item.path}
              style={[
                headerStyles.navBtn,
                isActive && headerStyles.activeBtn,
              ]}
              onPress={() => router.push(item.path)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  headerStyles.navLabel,
                  isActive && headerStyles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const headerStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  brand: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    backgroundColor: '#2280b0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  activeBtn: {
    backgroundColor: '#4caf50',
  },
  navLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '800',
  },
})

// ─────────────────────────────────────────────────────────────
// DASHBOARD SCREEN
// ─────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)

  const [revenue, setRevenue] = useState<{
    labels: string[]
    data: number[]
  }>({ labels: [], data: [] })

  const [productSales, setProductSales] = useState<{
    labels: string[]
    data: number[]
  }>({ labels: [], data: [] })

  const [categories, setCategories] = useState<
    { category: string; count: number }[]
  >([])

  const [pieData, setPieData] = useState<any[]>([])

  useEffect(() => {
    let mounted = true

    const fetchDashboard = async () => {
      try {
        const [
          monthsRes,
          productRes,
          customerRes,
          categoryRes,
        ] = await Promise.all([
          axios.get(`${API_URL}/admin/sales-per-month`),
          axios.get(`${API_URL}/admin/product-sales`),
          axios.get(`${API_URL}/admin/customer-sales`),
          axios.get(`${API_URL}/products/categories`),
        ])

        if (!mounted) return

        // Monthly revenue
        const months = monthsRes.data.salesPerMonth ?? []
        setRevenue({
          labels: months.map((m: any) => m.month),
          data: months.map((m: any) => Number(m.total)),
        })

        // Product sales
        const totalPercentage = productRes.data.totalPercentage ?? []
        setProductSales({
          labels: totalPercentage.map((p: any) =>
            p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name
          ),
          data: totalPercentage.map((p: any) => Number(p.percent)),
        })

        // Top customers pie
        const customers = customerRes.data.customerSales ?? []
        setPieData(
          customers.slice(0, 5).map((c: any, i: number) => ({
            name: c.userDetails?.name || `User ${i + 1}`,
            population: Number(c.total),
            color: ['#4caf50', '#ffca28', '#f44336', '#42a5f5', '#9c27b0'][i % 5],
            legendFontColor: '#333',
            legendFontSize: 12,
          }))
        )

        // Categories
        const cats = categoryRes.data.categories ?? []
        setCategories(
          cats.map((c: any) =>
            typeof c === 'string'
              ? { category: c, count: 1 }
              : {
                  category: c.category || String(c._id),
                  count: c.count || 1,
                }
          )
        )
      } catch (err) {
        console.warn('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <>
        <AdminHeader />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </>
    )
  }

  return (
    <>
      <AdminHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Admin Dashboard</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Revenue</Text>
          {revenue.labels.length ? (
            <LineChart
              data={{
                labels: revenue.labels,
                datasets: [{ data: revenue.data }],
              }}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <Text>No data</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Product Sales (%)</Text>
          {productSales.labels.length ? (
            <BarChart
              data={{
                labels: productSales.labels,
                datasets: [{ data: productSales.data }],
              }}
              width={screenWidth}
              height={240}
              chartConfig={chartConfig}
              fromZero
              showValuesOnTopOfBars
              style={styles.chart}
            />
          ) : (
            <Text>No data</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Customers</Text>
          {pieData.length ? (
            <PieChart
              data={pieData}
              width={screenWidth}
              height={220}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              chartConfig={chartConfig}
            />
          ) : (
            <Text>No data</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Categories ({categories.length})
          </Text>
          <View style={styles.catWrap}>
            {categories.map((c) => (
              <View key={c.category} style={styles.catBadge}>
                <Text>
                  {c.category} ({c.count})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  )
}

// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBadge: {
    backgroundColor: '#f2f2f2',
    padding: 8,
    borderRadius: 6,
  },
})

export default Dashboard