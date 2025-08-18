import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import bataanLogo from '/images/bataanlogo.png';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 2,
  },
  date: {
    fontSize: 10,
    color: '#666666',
    marginTop: 10,
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
  },
  infoCard: {
    width: '45%',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  requirementsList: {
    marginTop: 10,
  },
  requirementItem: {
    marginBottom: 8,
    fontSize: 11,
    color: '#1a1a1a',
  },
  attachmentsList: {
    marginTop: 10,
  },
  attachmentItem: {
    flexDirection: 'row',
    marginBottom: 8,
    fontSize: 11,
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

const EventReportPDF = ({ events }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={bataanLogo} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Provincial Government of Bataan</Text>
            <Text style={styles.subtitle}>Event Management System Report</Text>
            <Text style={styles.subtitle}>Event Requests Report</Text>
            <Text style={styles.date}>Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</Text>
          </View>
        </View>

        {/* Events */}
        {events.map((event, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{event.title}</Text>
            
            {/* Info Grid */}
            <View style={styles.infoGrid}>
              {/* Requestor */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Requestor</Text>
                <Text style={styles.infoValue}>{event.requestor}</Text>
                <Text style={[styles.infoValue, { fontSize: 10 }]}>{event.userDepartment}</Text>
              </View>

              {/* Date & Time */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoValue}>
                  {event.date ? format(new Date(event.date.seconds * 1000), "PPP") : "No date"}
                </Text>
                <Text style={[styles.infoValue, { fontSize: 10, color: '#2563eb' }]}>
                  {event.date ? format(new Date(event.date.seconds * 1000), "h:mm a") : "No time"}
                </Text>
              </View>

              {/* Location */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>

              {/* Participants */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Participants</Text>
                <Text style={styles.infoValue}>{event.participants} attendees</Text>
              </View>
            </View>

            {/* Requirements */}
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.sectionTitle, { fontSize: 12 }]}>Requirements</Text>
              <View style={styles.requirementsList}>
                {event.requirements?.map((req, idx) => {
                  const requirement = typeof req === 'string' ? { name: req } : req;
                  return (
                    <Text key={idx} style={styles.requirementItem}>
                      • {requirement.name}
                      {requirement.note && ` - ${requirement.note}`}
                    </Text>
                  );
                })}
              </View>
            </View>

            {/* Attachments */}
            {event.attachments && event.attachments.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { fontSize: 12 }]}>Attachments</Text>
                <View style={styles.attachmentsList}>
                  {event.attachments.map((file, idx) => (
                    <View key={idx} style={styles.attachmentItem}>
                      <Text>• {file.name} ({(file.size / 1024).toFixed(1)} KB)</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
        </Text>
      </Page>
    </Document>
  );
};

export default EventReportPDF;
