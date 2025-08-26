import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import bataanLogo from '/images/bataanlogo.png';

// Utility function to sanitize text for PDF
const sanitizeText = (text) => {
  if (!text) return '';
  
  try {
    // Convert to string if not already
    const textStr = String(text);
    
    // Remove any HTML tags first
    const withoutTags = textStr.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    const decoded = withoutTags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
    
    // Keep only printable characters and basic punctuation
    const cleaned = decoded.replace(/[^\w\s.,!?-]/g, '');
    
    return cleaned.trim();
  } catch (error) {
    console.error('Error sanitizing text:', error);
    return String(text).trim() || '';
  }
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: 'white',
    fontSize: 11,
    color: '#333333',
    lineHeight: 1.5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    top: 0,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 12,
  },
  headerText: {
    textAlign: 'center',
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 1,
    textAlign: 'center',
  },
  date: {
    fontSize: 9,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  divider: {
    borderBottom: '1 solid #e5e5e5',
    marginVertical: 15,
  },
  eventContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    flex: 1,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textDecoration: 'underline',
  },
  infoSection: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: '25%',
    fontWeight: 'bold',
  },
  infoValue: {
    width: '75%',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
    borderTop: '0.5 solid #e5e5e5',
    paddingTop: 8,
  },
});

// Reusable header component
const ReportHeader = () => (
  <>
    <View style={styles.headerContainer}>
      <Image src={bataanLogo} style={styles.logo} />
      <View style={styles.headerText}>
        <Text style={styles.title}>PROVINCIAL GOVERNMENT OF BATAAN</Text>
        <Text style={styles.subtitle}>Event Management System</Text>
        <Text style={styles.subtitle}>Event Requests Report</Text>
        <Text style={styles.date}>Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</Text>
      </View>
    </View>
    <View style={styles.divider} />
  </>
);

const EventReportPDF = ({ events }) => {
  return (
    <Document>
      {events.map((event, index) => (
        <Page key={index} size="A4" style={styles.page} wrap>
          {/* Header - repeated on each page automatically */}
          <ReportHeader />

          {/* Single event per page */}
          <View style={[styles.eventContainer, { borderBottom: 'none' }]}>
            <Text style={styles.eventTitle}>
              {(event.title && typeof event.title === 'string') 
                ? sanitizeText(event.title).toUpperCase() 
                : 'UNTITLED EVENT'}
            </Text>
            
            {/* Basic Information */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Requestor:</Text>
                <Text style={styles.infoValue}>{event.requestor}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department:</Text>
                <Text style={styles.infoValue}>{event.userDepartment || event.department || "Not specified"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {event.date ? format(new Date(event.date.seconds * 1000), "MMMM d, yyyy") : "Not specified"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>
                  {event.date ? format(new Date(event.date.seconds * 1000), "h:mm a") : "Not specified"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Participants:</Text>
                <Text style={styles.infoValue}>{event.participants} attendees</Text>
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{event.contactEmail || event.userEmail || "Not provided"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{event.contactNumber || "Not provided"}</Text>
              </View>
            </View>

            {/* Requirements */}
            {event.requirements && event.requirements.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                {event.requirements.map((req, idx) => {
                  const requirement = typeof req === 'string' ? { name: req } : req;
                  return (
                    <Text key={idx} style={styles.listItem}>
                      • {requirement.name}
                      {requirement.note && ` - ${requirement.note}`}
                    </Text>
                  );
                })}
              </View>
            )}
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
          </Text>
        </Page>
      ))}
    </Document>
  );
};

export default EventReportPDF;
