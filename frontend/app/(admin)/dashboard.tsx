import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Animated,
  Image,
  Alert,
} from 'react-native'
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit'
import { useRouter, usePathname } from 'expo-router'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem, removeItem } from '@/utils/storage'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'

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
// DESIGN TOKENS — Drift N' Dash, slightly lighter for admin
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#2a0508',   // lighter than user screens
  bgLayer:    '#350709',
  surface:    '#420a0e',
  border:     '#5a1015',
  accent:     '#800007',
  accentDim:  '#5a0005',
  accentGlow: 'rgba(128,0,7,0.14)',
  accentText: '#c0000a',
  mint:       '#996250',
  text:       '#F9F9F9',
  textSub:    '#c8a090',
  textDim:    '#7a3030',
  danger:     '#FF5A6E',
  dangerBg:   'rgba(255,90,110,0.10)',
  white:      '#FFFFFF',
}

const screenWidth = Dimensions.get('window').width - 32

const chartConfig = {
  backgroundGradientFrom: C.surface,
  backgroundGradientTo:   C.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 80, 60, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(249, 249, 249, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#ff9070',
  },
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const getOrderStatusStyle = (status: string) => {
  switch (status) {
    case 'Processing':
      return { backgroundColor: 'rgba(255,202,40,0.12)', borderColor: 'rgba(255,202,40,0.25)' }
    case 'Shipped':
      return { backgroundColor: 'rgba(192,0,10,0.12)',   borderColor: 'rgba(192,0,10,0.25)'   }
    case 'Delivered':
      return { backgroundColor: 'rgba(153,98,80,0.15)',  borderColor: 'rgba(153,98,80,0.3)'   }
    case 'Cancelled':
      return { backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.25)' }
    default:
      return { backgroundColor: 'rgba(249,249,249,0.04)', borderColor: 'rgba(249,249,249,0.07)' }
  }
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD SCREEN
// ─────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)

  const [revenue, setRevenue] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
  const [productSales, setProductSales] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [totals, setTotals] = useState<{ orders: number; sales: number }>({ orders: 0, sales: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  const getAuthHeader = async () => {
    const token = await getItem('authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    let mounted = true

    const fetchDashboard = async () => {
      try {
        const headers = await getAuthHeader()
        const [
          monthsRes, productRes, customerRes, categoryRes,
          ordersRes, totalOrdersRes, totalSalesRes,
        ] = await Promise.all([
          axios.get(`${API_URL}/admin/sales-per-month`, { headers }),
          axios.get(`${API_URL}/admin/product-sales`, { headers }),
          axios.get(`${API_URL}/admin/customer-sales`, { headers }),
          axios.get(`${API_URL}/products/categories`),
          axios.get(`${API_URL}/admin/orders`, { headers }),
          axios.get(`${API_URL}/admin/total-orders`, { headers }),
          axios.get(`${API_URL}/admin/total-sales`, { headers }),
        ])

        if (!mounted) return

        const months = monthsRes.data.salesPerMonth ?? []
        setRevenue({
          labels: months.map((m: any) => m.month),
          data:   months.map((m: any) => Number(m.total)),
        })

        const sales = productRes.data.sales ?? []
        const totalSales = Number(productRes.data.totalSales || 0)
        setProductSales({
          labels: sales.map((p: any) => p?._id || p?.name || 'Product'),
          data:   sales.map((p: any) =>
            totalSales && p?.total ? Number(((p.total / totalSales) * 100).toFixed(1)) : 0
          ),
        })

        const customers = customerRes.data.customerSales ?? []
        setPieData(
          customers.slice(0, 5).map((c: any, i: number) => ({
            name:            c.userDetails?.name || `User ${i + 1}`,
            population:      Number(c.total),
            color: ['#800007','#996250','#c0000a','#5a0005','#ffca28'][i % 5],
            legendFontColor: '#F9F9F9',
            legendFontSize:  12,
          }))
        )

        const cats = categoryRes.data.categories ?? []
        setCategories(
          cats.map((c: any) =>
            typeof c === 'string'
              ? { category: c, count: 1 }
              : { category: c.category || String(c._id), count: c.count || 1 }
          )
        )

        const ordersCount    = totalOrdersRes?.data?.totalOrders?.[0]?.count || 0
        const totalSalesValue = totalSalesRes?.data?.totalSales?.[0]?.totalSales || 0
        setTotals({ orders: Number(ordersCount), sales: Number(totalSalesValue) })

        const orders = ordersRes?.data?.orders || []
        setRecentOrders(orders.slice(0, 5))
      } catch (err) {
        console.warn('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <View style={styles.root}>
        <AdminHeader title="Dashboard" icon="chart-timeline" />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <AdminHeader title="Dashboard" icon="chart-timeline" />

      <ScrollView contentContainerStyle={styles.container}>

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.pageSubtitle}>Analytics & Performance Metrics</Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(128,0,7,0.15)' }]}>
              <MaterialCommunityIcons name="shopping-outline" size={24} color="#c0000a" />
            </View>
            <Text style={styles.kpiLabel}>Total Orders</Text>
            <Text style={styles.kpiValue}>{totals.orders}</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(153,98,80,0.15)' }]}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color="#996250" />
            </View>
            <Text style={styles.kpiLabel}>Total Sales</Text>
            <Text style={[styles.kpiValue, { color: C.mint }]}>
              ₱{Number(totals.sales).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        {/* Monthly Revenue Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Monthly Revenue</Text>
              <Text style={styles.cardSub}>Sales trends over time</Text>
            </View>
            <MaterialCommunityIcons name="chart-line" size={20} color={C.accent} />
          </View>
          {revenue.labels.length ? (
            <View style={styles.chartWrap}>
              <LineChart
                data={{ labels: revenue.labels, datasets: [{ data: revenue.data }] }}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          ) : (
            <Text style={styles.noData}>No revenue data available</Text>
          )}
        </View>

        {/* Top Product Sales Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Top Product Sales</Text>
              <Text style={styles.cardSub}>Performance by product</Text>
            </View>
            <MaterialCommunityIcons name="chart-bar" size={20} color={C.accent} />
          </View>
          {productSales.labels.length ? (
            <View style={styles.chartWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={{
                    labels: productSales.labels.map(l => l.length > 12 ? l.substring(0, 12) + '...' : l),
                    datasets: [{ data: productSales.data }],
                  }}
                  width={Math.max(screenWidth, productSales.labels.length * 80)}
                  height={300}
                  chartConfig={{ ...chartConfig, labelColor: (opacity = 1) => `rgba(249, 249, 249, ${opacity})` }}
                  fromZero
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix="%"
                  style={styles.chart}
                />
              </ScrollView>
              <Text style={styles.chartNote}>← Swipe to view more products →</Text>
            </View>
          ) : (
            <Text style={styles.noData}>No product sales data available</Text>
          )}
        </View>

        {/* Top Customers */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Top Customers</Text>
              <Text style={styles.cardSub}>Best performing customers</Text>
            </View>
            <MaterialCommunityIcons name="account-multiple" size={20} color={C.accent} />
          </View>
          {pieData.length ? (
            <View style={styles.chartWrap}>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <PieChart
                  data={pieData}
                  width={screenWidth - 48}
                  height={180}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                  chartConfig={chartConfig}
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(153,98,80,0.15)' }}>
                {pieData.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                    <Text style={{ fontSize: 11, color: C.text, fontWeight: '500' }}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>No customer data available</Text>
          )}
        </View>

        {/* Recent Orders */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Recent Orders</Text>
              <Text style={styles.cardSub}>Latest transactions</Text>
            </View>
            <MaterialCommunityIcons name="package-variant" size={20} color={C.accent} />
          </View>

          {recentOrders.length ? (
            <View>
              {recentOrders.map((o) => (
                <TouchableOpacity key={o._id} style={styles.orderCard} activeOpacity={0.7}>
                  <View style={styles.orderIconWrap}>
                    <MaterialCommunityIcons name="package-variant" size={16} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>Order #{String(o._id).slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(o.createdAt || o.paidAt || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderPrice}>
                      ₱{Number(o.totalPrice).toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                    </Text>
                    <View style={[styles.orderStatusBadge, getOrderStatusStyle(o.orderStatus)]}>
                      <Text style={styles.orderStatusText}>{o.orderStatus || 'Pending'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>No orders found</Text>
          )}
        </View>

        {/* Categories */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Categories</Text>
              <Text style={styles.cardSub}>{categories.length} categories available</Text>
            </View>
            <MaterialCommunityIcons name="folder-multiple" size={20} color={C.accent} />
          </View>
          {categories.length ? (
            <View style={styles.categoryGrid}>
              {categories.map((c) => (
                <View key={c.category} style={styles.categoryBadge}>
                  <Text style={styles.categoryName}>{c.category}</Text>
                  <Text style={styles.categoryCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>No categories found</Text>
          )}
        </View>

      </ScrollView>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: C.bg,
  },

  pageHeader: {
    paddingBottom: 16,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: C.textSub,
    opacity: 0.8,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  kpiIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    color: C.textSub,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.accent,
  },

  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: C.textSub,
    opacity: 0.8,
  },

  chartWrap: {
    backgroundColor: C.bgLayer,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
  },
  chartNote: {
    fontSize: 10,
    color: C.textDim,
    textAlign: 'center',
    marginTop: 8,
  },
  noData: {
    color: C.textSub,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgLayer,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  orderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(128,0,7,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  orderDate: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 2,
    opacity: 0.8,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: C.mint,
    marginBottom: 6,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textSub,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryBadge: {
    backgroundColor: C.bgLayer,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '800',
    color: C.accent,
    textAlign: 'center',
  },
})

export default Dashboard