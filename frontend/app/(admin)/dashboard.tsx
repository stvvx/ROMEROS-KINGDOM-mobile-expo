import React, { useEffect, useState, useRef } from 'react'
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
} from 'react-native'
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit'
import { useRouter } from 'expo-router'
import axios from 'axios'
import Constants from 'expo-constants'
import { getItem } from '@/utils/storage'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import AdminHeader from '@/components/adminHeader'

let API_URL =
  process.env.NGROK_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1'

const manifest: any = (Constants as any).manifest || (Constants as any).expoConfig
const debuggerHost  = manifest?.debuggerHost ? manifest.debuggerHost.split(':')[0] : null

if (debuggerHost && debuggerHost !== 'localhost') {
  API_URL = API_URL.replace('localhost', debuggerHost)
} else if (Platform.OS === 'android' && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', '10.0.2.2')
}

/* ─────────────────────────────────────────
   Palette — Blue Robotics (Admin variant)
   Slightly elevated surface vs user screens
───────────────────────────────────────── */
const C = {
  bg:          '#020B18',
  bgLayer:     '#040F1F',
  surface:     '#071828',
  surfaceHigh: '#0A2035',
  border:      '#0D2440',
  borderBright:'rgba(0,168,255,0.45)',
  accent:      '#00A8FF',
  accentDim:   '#005A8E',
  accentGlow:  'rgba(0,168,255,0.1)',
  accentText:  '#33BBFF',
  text:        '#E8F4FF',
  textSub:     'rgba(120,180,230,0.7)',
  textDim:     'rgba(60,110,170,0.45)',
  danger:      '#FF4060',
  dangerBg:    'rgba(255,64,96,0.08)',
  dangerBorder:'rgba(255,64,96,0.22)',
  success:     '#00D4AA',
  successBg:   'rgba(0,212,170,0.08)',
  successBorder:'rgba(0,212,170,0.3)',
  warn:        '#F59E0B',
  warnBg:      'rgba(245,158,11,0.1)',
  warnBorder:  'rgba(245,158,11,0.28)',
  white:       '#FFFFFF',
} as const

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

const screenWidth = Dimensions.get('window').width - 32

/* ─────────────────────────────────────────
   Chart config — cyan palette for charts
───────────────────────────────────────── */
const chartConfig = {
  backgroundGradientFrom: C.surface,
  backgroundGradientTo:   C.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 168, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(232, 244, 255, ${opacity * 0.75})`,
  style: { borderRadius: 12 },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#33BBFF',
  },
}

/* ─────────────────────────────────────────
   Order status config
───────────────────────────────────────── */
const ORDER_STATUS_CONFIG: Record<string, {
  color: string; bg: string; border: string;
  iconLib: 'mci' | 'feather'; iconName: string;
}> = {
  Processing: { color: C.warn,    bg: C.warnBg,    border: C.warnBorder,    iconLib: 'mci',     iconName: 'clock-outline'           },
  Shipped:    { color: C.accent,  bg: C.accentGlow,border: C.borderBright,  iconLib: 'mci',     iconName: 'truck-delivery-outline'  },
  Delivered:  { color: C.success, bg: C.successBg, border: C.successBorder, iconLib: 'mci',     iconName: 'check-circle-outline'    },
  Cancelled:  { color: C.danger,  bg: C.dangerBg,  border: C.dangerBorder,  iconLib: 'feather', iconName: 'x-circle'                },
}

function OrderStatusIcon({ status, size, color }: { status: string; size: number; color: string }) {
  const cfg = ORDER_STATUS_CONFIG[status]
  if (!cfg) return <MaterialCommunityIcons name="circle-outline" size={size} color={color} />
  if (cfg.iconLib === 'feather') return <Feather name={cfg.iconName as any} size={size} color={color} />
  return <MaterialCommunityIcons name={cfg.iconName as any} size={size} color={color} />
}

function getOrderStatusStyle(status: string) {
  return ORDER_STATUS_CONFIG[status] ?? {
    color: C.textSub, bg: C.surface, border: C.border,
  }
}

function getOrderTimeValue(order: any) {
  const raw = order?.createdAt || order?.paidAt
  const ts = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(ts) ? ts : 0
}

/* ─────────────────────────────────────────
   Stat Card
───────────────────────────────────────── */
const StatCard = ({
  label, value, iconName, iconLib = 'mci', color, bg,
}: {
  label: string; value: string | number;
  iconName: string; iconLib?: 'mci' | 'feather';
  color: string; bg: string;
}) => (
  <View style={s.kpiCard}>
    {/* Corner accents */}
    <View style={[s.kpiCornerTL, { borderColor: color }]} />
    <View style={[s.kpiCornerBR, { borderColor: color }]} />
    <View style={[s.kpiIconWrap, { backgroundColor: bg, borderColor: color + '66' }]}>
      {iconLib === 'feather'
        ? <Feather name={iconName as any} size={22} color={color} />
        : <MaterialCommunityIcons name={iconName as any} size={22} color={color} />
      }
    </View>
    <Text style={s.kpiLabel}>{label}</Text>
    <Text style={[s.kpiValue, { color }]}>{value}</Text>
  </View>
)

/* ─────────────────────────────────────────
   Panel Card wrapper
───────────────────────────────────────── */
const PanelCard = ({
  title, subtitle, iconName, children, accentColor = C.accent,
}: {
  title: string; subtitle: string; iconName: string;
  children: React.ReactNode; accentColor?: string;
}) => (
  <View style={s.card}>
    <View style={[s.cardCornerTL, { borderColor: accentColor }]} />
    <View style={[s.cardCornerTR, { borderColor: accentColor }]} />
    <View style={s.cardHeader}>
      <View style={s.cardHeaderLeft}>
        <View style={[s.cardIconWrap, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}55` }]}>
          <MaterialCommunityIcons name={iconName as any} size={16} color={accentColor} />
        </View>
        <View style={s.cardTitleBlock}>
          <View style={[s.cardTick, { backgroundColor: accentColor }]} />
          <View>
            <Text style={[s.cardTitle, { color: accentColor }]}>{title}</Text>
            <Text style={s.cardSub}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </View>
    <View style={s.cardDivider} />
    {children}
  </View>
)

/* ─────────────────────────────────────────
   Dashboard Screen
───────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const [loading,      setLoading]      = useState(true)
  const [revenue,      setRevenue]      = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
  const [productSales, setProductSales] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
  const [categories,   setCategories]   = useState<{ category: string; count: number }[]>([])
  const [pieData,      setPieData]      = useState<any[]>([])
  const [totals,       setTotals]       = useState<{ orders: number; sales: number }>({ orders: 0, sales: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  const fade = useRef(new Animated.Value(0)).current

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
          axios.get(`${API_URL}/admin/sales-per-month`,  { headers }),
          axios.get(`${API_URL}/admin/product-sales`,    { headers }),
          axios.get(`${API_URL}/admin/customer-sales`,   { headers }),
          axios.get(`${API_URL}/products/categories`),
          axios.get(`${API_URL}/admin/orders`,           { headers }),
          axios.get(`${API_URL}/admin/total-orders`,     { headers }),
          axios.get(`${API_URL}/admin/total-sales`,      { headers }),
        ])

        if (!mounted) return

        const months = monthsRes.data.salesPerMonth ?? []
        setRevenue({
          labels: months.map((m: any) => m.month),
          data:   months.map((m: any) => Number(m.total)),
        })

        const sales      = productRes.data.sales ?? []
        const totalSales = Number(productRes.data.totalSales || 0)
        setProductSales({
          labels: sales.map((p: any) => p?._id || p?.name || 'Product'),
          data:   sales.map((p: any) =>
            totalSales && p?.total ? Number(((p.total / totalSales) * 100).toFixed(1)) : 0
          ),
        })

        const customers = customerRes.data.customerSales ?? []
        // Cyan-tinted palette for pie slices
        setPieData(
          customers.slice(0, 5).map((c: any, i: number) => ({
            name:            c.userDetails?.name || `User ${i + 1}`,
            population:      Number(c.total),
            color: ['#00A8FF','#33BBFF','#005A8E','#00D4AA','#F59E0B'][i % 5],
            legendFontColor: C.textSub,
            legendFontSize:  11,
          }))
        )

        const cats = categoryRes.data.categories ?? []
        setCategories(
          cats.map((c: any) =>
            typeof c === 'string'
              ? { category: c, count: 1 }
              : { category: c.category || c.name || 'Unknown', count: c.count || 1 }
          )
        )

        const ordersCount     = totalOrdersRes?.data?.totalOrders?.[0]?.count || 0
        const totalSalesValue = totalSalesRes?.data?.totalSales?.[0]?.totalSales || 0
        setTotals({ orders: Number(ordersCount), sales: Number(totalSalesValue) })

        const orders = ordersRes?.data?.orders || []
        const sortedOrders = [...orders].sort((a, b) => getOrderTimeValue(b) - getOrderTimeValue(a))
        const orders2026 = sortedOrders.filter((o) => {
          const raw = o?.createdAt || o?.paidAt
          if (!raw) return false
          return new Date(raw).getFullYear() === 2026
        })
        const non2026Orders = sortedOrders.filter((o) => {
          const raw = o?.createdAt || o?.paidAt
          if (!raw) return true
          return new Date(raw).getFullYear() !== 2026
        })
        setRecentOrders([...orders2026, ...non2026Orders].slice(0, 5))

        Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start()
      } catch (err) {
        console.warn('Dashboard error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchDashboard()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <View style={s.root}>
        <AdminHeader title="Dashboard" icon="chart-timeline" />
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>SYNCING DATA...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Dashboard" icon="chart-timeline" />

      <Animated.ScrollView
        contentContainerStyle={s.container}
        style={{ opacity: fade }}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════
            PAGE HEADER
        ══════════════════════════════════ */}
        <View style={s.pageHeader}>
          <View style={s.pageHeaderLeft}>
            <View style={s.pageHeaderTick} />
            <View>
              <Text style={s.pageTitle}>DASHBOARD</Text>
              <Text style={s.pageSubtitle}>ANALYTICS & PERFORMANCE METRICS</Text>
            </View>
          </View>
          {/* Live indicator */}
          <View style={s.liveIndicator}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </View>

        {/* ══════════════════════════════════
            RECENT ORDERS
        ══════════════════════════════════ */}
        <PanelCard
          title="RECENT ORDERS"
          subtitle="Latest transactions"
          iconName="package-variant"
          accentColor={C.warn}
        >
          {recentOrders.length ? (
            <View style={{ gap: 8 }}>
              {recentOrders.map((o) => {
                const statusCfg = getOrderStatusStyle(o.orderStatus)
                return (
                  <TouchableOpacity key={o._id} style={s.orderCard} activeOpacity={0.8}>
                    {/* Status-colored rail */}
                    <View style={[s.orderRail, { backgroundColor: statusCfg.color }]} />
                    <View style={[s.orderIconWrap, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                      <OrderStatusIcon status={o.orderStatus} size={14} color={statusCfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.orderId}>#{String(o._id).slice(-6).toUpperCase()}</Text>
                      <Text style={s.orderDate}>
                        {new Date(o.createdAt || o.paidAt || Date.now()).toLocaleDateString('en-CA')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.orderPrice}>
                        ₱{Number(o.totalPrice).toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                      </Text>
                      <View style={[s.orderStatusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                        <Text style={[s.orderStatusText, { color: statusCfg.color }]}>
                          {(o.orderStatus || 'PENDING').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            <View style={s.noDataWrap}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color={C.textDim} />
              <Text style={s.noData}>NO ORDERS FOUND</Text>
            </View>
          )}
        </PanelCard>

        {/* ══════════════════════════════════
            KPI CARDS
        ══════════════════════════════════ */}
        <View style={s.kpiRow}>
          <StatCard
            label="TOTAL ORDERS"
            value={totals.orders}
            iconName="shopping-outline"
            color={C.accent}
            bg={C.accentGlow}
          />
          <StatCard
            label="TOTAL SALES"
            value={`₱${Number(totals.sales).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
            iconName="cash-multiple"
            color={C.success}
            bg={C.successBg}
          />
        </View>

        {/* ══════════════════════════════════
            MONTHLY REVENUE CHART
        ══════════════════════════════════ */}
        <PanelCard
          title="MONTHLY REVENUE"
          subtitle="Sales trends over time"
          iconName="chart-line"
          accentColor={C.accent}
        >
          {revenue.labels.length ? (
            <View style={s.chartWrap}>
              <LineChart
                data={{ labels: revenue.labels, datasets: [{ data: revenue.data }] }}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={s.chart}
              />
            </View>
          ) : (
            <View style={s.noDataWrap}>
              <Feather name="bar-chart-2" size={24} color={C.textDim} />
              <Text style={s.noData}>NO REVENUE DATA</Text>
            </View>
          )}
        </PanelCard>

        {/* ══════════════════════════════════
            TOP PRODUCT SALES CHART
        ══════════════════════════════════ */}
        <PanelCard
          title="TOP PRODUCT SALES"
          subtitle="Performance by product (%)"
          iconName="chart-bar"
          accentColor={C.accentText}
        >
          {productSales.labels.length ? (
            <View style={s.chartWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={{
                    labels: productSales.labels.map(l => l.length > 12 ? l.substring(0, 12) + '…' : l),
                    datasets: [{ data: productSales.data }],
                  }}
                  width={Math.max(screenWidth - 32, productSales.labels.length * 80)}
                  height={300}
                  chartConfig={chartConfig}
                  fromZero
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix="%"
                  style={s.chart}
                />
              </ScrollView>
              <View style={s.chartNoteRow}>
                <Feather name="arrow-left" size={9} color={C.textDim} />
                <Text style={s.chartNote}>SWIPE TO SCAN MORE PRODUCTS</Text>
                <Feather name="arrow-right" size={9} color={C.textDim} />
              </View>
            </View>
          ) : (
            <View style={s.noDataWrap}>
              <Feather name="bar-chart-2" size={24} color={C.textDim} />
              <Text style={s.noData}>NO PRODUCT SALES DATA</Text>
            </View>
          )}
        </PanelCard>

        {/* ══════════════════════════════════
            TOP CUSTOMERS PIE
        ══════════════════════════════════ */}
        <PanelCard
          title="TOP CUSTOMERS"
          subtitle="Best performing operators"
          iconName="account-multiple"
          accentColor={C.success}
        >
          {pieData.length ? (
            <View style={s.chartWrap}>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <PieChart
                  data={pieData}
                  width={screenWidth - 64}
                  height={180}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                  chartConfig={chartConfig}
                />
              </View>
              {/* Legend */}
              <View style={s.pieLegend}>
                {pieData.map((item, idx) => (
                  <View key={idx} style={s.pieLegendItem}>
                    <View style={[s.pieLegendDot, { backgroundColor: item.color }]} />
                    <Text style={s.pieLegendText}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={s.noDataWrap}>
              <MaterialCommunityIcons name="account-off-outline" size={24} color={C.textDim} />
              <Text style={s.noData}>NO CUSTOMER DATA</Text>
            </View>
          )}
        </PanelCard>

        {/* ══════════════════════════════════
            CATEGORIES
        ══════════════════════════════════ */}
        <PanelCard
          title="CATEGORIES"
          subtitle={`${categories.length} categories indexed`}
          iconName="folder-multiple"
          accentColor={C.accentDim}
        >
          {categories.length ? (
            <View style={s.categoryGrid}>
              {categories.map((c) => (
                <View key={c.category} style={s.categoryBadge}>
                  <MaterialCommunityIcons name="tag-outline" size={11} color={C.accentDim} style={{ marginBottom: 4 }} />
                  <Text style={s.categoryName}>{c.category.toUpperCase()}</Text>
                  <Text style={s.categoryCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.noDataWrap}>
              <MaterialCommunityIcons name="folder-off-outline" size={24} color={C.textDim} />
              <Text style={s.noData}>NO CATEGORIES</Text>
            </View>
          )}
        </PanelCard>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  )
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 12 },
  loadingText:{ color: C.textDim, fontSize: 10, letterSpacing: 2.5, fontFamily: MONO, marginTop: 4 },

  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: C.bg,
  },

  /* Page header */
  pageHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, marginBottom: 8 },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageHeaderTick: { width: 3, height: 28, borderRadius: 2, backgroundColor: C.accent },
  pageTitle:      { color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },
  pageSubtitle:   { color: C.textDim, fontSize: 8, letterSpacing: 2, marginTop: 2, fontFamily: MONO },

  /* Live indicator */
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
  liveText:      { color: C.success, fontSize: 9, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },

  /* KPI row */
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  kpiCornerTL: { position: 'absolute', top: -1, left: -1,   width: 12, height: 12, borderTopWidth: 1.5, borderLeftWidth: 1.5,  borderTopLeftRadius: 14 },
  kpiCornerBR: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 14 },
  kpiIconWrap: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiLabel:    { fontSize: 8, color: C.textDim, fontWeight: '700', letterSpacing: 1.8, marginBottom: 6, fontFamily: MONO },
  kpiValue:    { fontSize: 18, fontWeight: '800', fontFamily: MONO },

  /* Panel card */
  card: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, marginBottom: 16,
  },
  cardCornerTL: { position: 'absolute', top: -1, left: -1,  width: 14, height: 14, borderTopWidth: 1.5, borderLeftWidth: 1.5,  borderTopLeftRadius: 14 },
  cardCornerTR: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 14 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap:   { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTick:       { width: 2.5, height: 14, borderRadius: 1.5 },
  cardTitle:      { fontSize: 11, fontWeight: '800', letterSpacing: 2.5, fontFamily: MONO },
  cardSub:        { fontSize: 10, color: C.textDim, marginTop: 1 },
  cardDivider:    { height: 1, backgroundColor: C.border, marginBottom: 14 },

  /* Charts */
  chartWrap: { backgroundColor: C.bgLayer, borderRadius: 11, padding: 8, marginBottom: 4 },
  chart:     { borderRadius: 10 },
  chartNoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  chartNote: { fontSize: 8, color: C.textDim, textAlign: 'center', letterSpacing: 1.5, fontFamily: MONO },

  noDataWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noData:     { color: C.textDim, fontSize: 10, textAlign: 'center', letterSpacing: 2, fontFamily: MONO },

  /* Pie legend */
  pieLegend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  pieLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pieLegendDot:  { width: 8, height: 8, borderRadius: 4 },
  pieLegendText: { fontSize: 10, color: C.textSub, fontFamily: MONO },

  /* Order cards */
  orderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bgLayer,
    borderRadius: 11, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 2,
  },
  orderRail:        { width: 3, alignSelf: 'stretch' },
  orderIconWrap:    { width: 38, height: 38, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', margin: 10, marginRight: 12 },
  orderId:          { fontSize: 12, fontWeight: '700', color: C.text, fontFamily: MONO, letterSpacing: 1 },
  orderDate:        { fontSize: 10, color: C.textDim, marginTop: 2, fontFamily: MONO },
  orderPrice:       { fontSize: 13, fontWeight: '800', color: C.accentText, marginBottom: 5, fontFamily: MONO, paddingRight: 12 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginRight: 12 },
  orderStatusText:  { fontSize: 8, fontWeight: '800', letterSpacing: 1, fontFamily: MONO },

  /* Category grid */
  categoryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryBadge: {
    backgroundColor: C.bgLayer,
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 13,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', gap: 3, minWidth: 80,
  },
  categoryName:  { fontSize: 9, fontWeight: '700', color: C.textSub, textAlign: 'center', letterSpacing: 1, fontFamily: MONO },
  categoryCount: { fontSize: 14, fontWeight: '800', color: C.accent, textAlign: 'center', fontFamily: MONO },
})

export default Dashboard