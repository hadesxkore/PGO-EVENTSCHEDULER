import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import bataanLogo from '/images/bataanlogo.png';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  headerText: {
    textAlign: 'center',
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a4a4a',
    marginBottom: 4,
    textAlign: 'center',
  },
  date: {
    fontSize: 10,
    color: '#666666',
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    borderBottom: '1 solid #e5e5e5',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    width: '30%',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#666666',
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: '#1a1a1a',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#666666',
    fontSize: 8,
  },
});

const ReportPDF = ({ reportData, selectedPeriod }) => {
  const periodText = {
    week: 'Last Week',
    month: 'Last Month',
    quarter: 'Last Quarter',
    year: 'Last Year'
  }[selectedPeriod];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ alignItems: 'center' }}>
            <Image src={bataanLogo} style={styles.logo} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Provincial Government of Bataan</Text>
              <Text style={styles.subtitle}>Event Management System Report</Text>
              <Text style={styles.subtitle}>{periodText} Report</Text>
              <Text style={styles.date}>Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{reportData.totalEvents}</Text>
              <Text style={styles.metricLabel}>Total Events</Text>
              <Text style={[styles.metricLabel, { color: '#2563eb' }]}>
                +{reportData.monthlyGrowth}% from last month
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{reportData.totalUsers}</Text>
              <Text style={styles.metricLabel}>Active Users</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{reportData.totalDepartments}</Text>
              <Text style={styles.metricLabel}>Active Departments</Text>
            </View>
          </View>
        </View>

        {/* Top Departments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Departments by Events</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Department</Text>
              <Text style={styles.tableCell}>Events</Text>
              <Text style={styles.tableCell}>Percentage</Text>
            </View>
            {reportData.topDepartments.map((dept, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{dept.name}</Text>
                <Text style={styles.tableCell}>{dept.events}</Text>
                <Text style={styles.tableCell}>{dept.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Statistics</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Month</Text>
              <Text style={styles.tableCell}>Events</Text>
              <Text style={styles.tableCell}>Users</Text>
              <Text style={styles.tableCell}>Requests</Text>
            </View>
            {reportData.monthlyStats.map((stat, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{stat.month}</Text>
                <Text style={styles.tableCell}>{stat.events}</Text>
                <Text style={styles.tableCell}>{stat.users}</Text>
                <Text style={styles.tableCell}>{stat.requests}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
        </Text>
      </Page>
    </Document>
  );
};

export default ReportPDF;
