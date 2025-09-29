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
    borderBottom: '2 solid #333333',
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
    marginBottom: 12,
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
    color: '#1e40af',
  },
  statsSection: {
    marginVertical: 15,
    paddingVertical: 10,
    borderTop: '0.5 solid #e5e5e5',
    borderBottom: '0.5 solid #e5e5e5',
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10,
    width: '60%',
  },
  statValue: {
    fontSize: 10,
    fontWeight: 'bold',
    width: '40%',
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  requirementItem: {
    width: '48%', // Two columns with small gap
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: '0.5 solid #e5e5e5',
  },
  requirementName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    marginBottom: 4,
  },
  requirementNote: {
    fontSize: 9,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 4,
    paddingLeft: 12,
  },
  remarksLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 2,
  },
  remarksText: {
    fontSize: 9,
    paddingLeft: 12,
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
        <Text style={styles.subtitle}>Event Accomplishment Report</Text>
        <Text style={styles.date}>Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</Text>
      </View>
    </View>
    <View style={styles.divider} />
  </>
);

const AccomplishmentReportPDF = ({ event, requirementStatus, requirementRemarks, userDepartment }) => {
  // Debug: Log the event data to see what fields are available
  console.log('Event data in PDF:', event);
  console.log('Event keys:', Object.keys(event || {}));
  
  // Calculate statistics
  const totalRequirements = event.requirements?.length || 0;
  const completedRequirements = event.requirements?.filter(req => {
    const key = `${event.id}-${req.name}`;
    return requirementStatus[key];
  }).length || 0;
  const pendingRequirements = totalRequirements - completedRequirements;
  const completionRate = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;

  return (
    <Document>
      {/* First Page - Event Information */}
      <Page size="A4" style={styles.page} wrap>
        {/* Header on every page */}
        <View fixed>
          <ReportHeader />
        </View>
        
        <View style={styles.eventContainer}>
          <Text style={styles.eventTitle}>
            {sanitizeText(event.title || 'UNTITLED EVENT').toUpperCase()}
          </Text>
          
          {/* Basic Information */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Requestor:</Text>
              <Text style={styles.infoValue}>{sanitizeText(
                event.requestor || 
                event.eventRequestor || 
                event.createdBy || 
                event.userEmail || 
                event.contactEmail ||
                event.userName ||
                event.department || // Use department as fallback since no requestor field exists
                'N/A'
              )}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoValue}>{sanitizeText(
                event.department || 
                event.userDepartment || 
                userDepartment || 
                event.taggedDepartment ||
                'N/A'
              )}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{sanitizeText(event.location || event.eventLocation || 'N/A')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Start Date:</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  // Use the correct field name from actual data: 'start'
                  const dateField = event.start || event.startDate || event.eventStartDate || event.date;
                  
                  if (!dateField) return "N/A";
                  
                  try {
                    let date;
                    if (dateField.toDate) {
                      date = dateField.toDate();
                    } else if (dateField.seconds) {
                      date = new Date(dateField.seconds * 1000);
                    } else if (dateField instanceof Date) {
                      date = dateField;
                    } else if (typeof dateField === 'string' || typeof dateField === 'number') {
                      date = new Date(dateField);
                    } else {
                      date = dateField;
                    }
                    
                    if (isNaN(date.getTime())) return "Invalid date";
                    return format(date, "MMMM d, yyyy");
                  } catch (error) {
                    console.log('Start date parsing error:', error, dateField);
                    return "Invalid date";
                  }
                })()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>End Date:</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  // Use the correct field name from actual data: 'actualEndDate'
                  const dateField = event.actualEndDate || event.endDate || event.eventEndDate || event.end;
                  
                  if (!dateField) return "N/A";
                  
                  try {
                    let date;
                    if (dateField.toDate) {
                      date = dateField.toDate();
                    } else if (dateField.seconds) {
                      date = new Date(dateField.seconds * 1000);
                    } else if (dateField instanceof Date) {
                      date = dateField;
                    } else if (typeof dateField === 'string' || typeof dateField === 'number') {
                      date = new Date(dateField);
                    } else {
                      date = dateField;
                    }
                    
                    if (isNaN(date.getTime())) return "Invalid date";
                    return format(date, "MMMM d, yyyy");
                  } catch (error) {
                    console.log('End date parsing error:', error, dateField);
                    return "Invalid date";
                  }
                })()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Participants:</Text>
              <Text style={styles.infoValue}>{sanitizeText(event.participants || 'N/A')}</Text>
            </View>
          </View>

          {/* Summary Statistics */}
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Summary</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Requirements:</Text>
              <Text style={styles.statValue}>{totalRequirements}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Completed:</Text>
              <Text style={styles.statValue}>{completedRequirements}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending:</Text>
              <Text style={styles.statValue}>{pendingRequirements}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Completion Rate:</Text>
              <Text style={styles.statValue}>{completionRate}%</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
        </Text>
      </Page>

      {/* Second Page - Department Requirements */}
      <Page size="A4" style={styles.page} wrap>
        {/* Header on every page */}
        <View fixed>
          <ReportHeader />
        </View>
        
        <View style={styles.eventContainer}>
          {/* Requirements Section */}
          <Text style={styles.sectionTitle}>Department Requirements</Text>
          
          {event.requirements && event.requirements.length > 0 ? (
            <View style={styles.requirementsGrid}>
              {event.requirements.map((req, index) => {
                const key = `${event.id}-${req.name}`;
                const isCompleted = requirementStatus[key] || false;
                const remarks = requirementRemarks[key] || '';
                
                return (
                  <View key={index} style={styles.requirementItem}>
                    <Text style={styles.requirementName}>{sanitizeText(req.name)}</Text>
                    <Text style={styles.statusText}>
                      Status: {isCompleted ? 'COMPLETED' : 'PENDING'}
                    </Text>
                    
                    {req.note && (
                      <Text style={styles.requirementNote}>
                        Note: {sanitizeText(req.note)}
                      </Text>
                    )}
                    
                    {remarks && (
                      <>
                        <Text style={styles.remarksLabel}>Accomplishment Remarks:</Text>
                        <Text style={styles.remarksText}>{sanitizeText(remarks)}</Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ textAlign: 'center', fontStyle: 'italic', color: '#666666', marginTop: 20 }}>
              No requirements found for this event.
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
        </Text>
      </Page>
    </Document>
  );
};

export default AccomplishmentReportPDF;
