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
    marginBottom: 8,
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
    marginBottom: 6,
    marginTop: 8,
  },
  listItem: {
    marginBottom: 2,
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
        <>
          {/* First Page - Event Details */}
          <Page key={`${index}-details`} size="A4" style={styles.page} wrap>
            <ReportHeader />
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
                {/* Multiple Locations or Single Location */}
                {event.locations && event.locations.length > 0 ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Schedule:</Text>
                    <Text style={styles.infoValue}>Multiple locations (see detailed schedule below)</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Start Date:</Text>
                      <Text style={styles.infoValue}>
                        {event.startDate ? (() => {
                          try {
                            let date;
                            if (event.startDate.toDate) {
                              date = event.startDate.toDate();
                            } else if (event.startDate.seconds) {
                              date = new Date(event.startDate.seconds * 1000);
                            } else {
                              date = new Date(event.startDate);
                            }
                            return format(date, "MMMM d, yyyy h:mm a");
                          } catch (error) {
                            return "Invalid date";
                          }
                        })() : event.date ? (() => {
                          try {
                            return format(new Date(event.date.seconds * 1000), "MMMM d, yyyy h:mm a");
                          } catch (error) {
                            return "Invalid date";
                          }
                        })() : "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>End Date:</Text>
                      <Text style={styles.infoValue}>
                        {event.endDate ? (() => {
                          try {
                            let date;
                            if (event.endDate.toDate) {
                              date = event.endDate.toDate();
                            } else if (event.endDate.seconds) {
                              date = new Date(event.endDate.seconds * 1000);
                            } else {
                              date = new Date(event.endDate);
                            }
                            return format(date, "MMMM d, yyyy h:mm a");
                          } catch (error) {
                            return "Invalid date";
                          }
                        })() : "Not specified"}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Location:</Text>
                      <Text style={styles.infoValue}>{event.location || "Not specified"}</Text>
                    </View>
                  </>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Participants:</Text>
                  <Text style={styles.infoValue}>{event.participants} attendees</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>VIP:</Text>
                  <Text style={styles.infoValue}>{event.vip || 0} VIPs</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>VVIP:</Text>
                  <Text style={styles.infoValue}>{event.vvip || 0} VVIPs</Text>
                </View>
              </View>

              {/* Multiple Locations Schedule */}
              {event.locations && event.locations.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Detailed Location Schedule</Text>
                  {event.locations.map((location, index) => (
                    <View key={index} style={{ marginBottom: 12, paddingLeft: 8, borderLeft: '2 solid #e5e5e5' }}>
                      <Text style={[styles.infoLabel, { fontSize: 10, marginBottom: 4 }]}>
                        Location {index + 1}: {location.location}
                      </Text>
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { width: '30%', fontSize: 9 }]}>Start:</Text>
                        <Text style={[styles.infoValue, { width: '70%', fontSize: 9 }]}>
                          {location.startDate ? (() => {
                            try {
                              let date;
                              if (location.startDate.toDate) {
                                date = location.startDate.toDate();
                              } else if (location.startDate.seconds) {
                                date = new Date(location.startDate.seconds * 1000);
                              } else {
                                date = new Date(location.startDate);
                              }
                              return format(date, "MMM d, yyyy h:mm a");
                            } catch (error) {
                              return "Invalid date";
                            }
                          })() : "Not specified"}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { width: '30%', fontSize: 9 }]}>End:</Text>
                        <Text style={[styles.infoValue, { width: '70%', fontSize: 9 }]}>
                          {location.endDate ? (() => {
                            try {
                              let date;
                              if (location.endDate.toDate) {
                                date = location.endDate.toDate();
                              } else if (location.endDate.seconds) {
                                date = new Date(location.endDate.seconds * 1000);
                              } else {
                                date = new Date(location.endDate);
                              }
                              return format(date, "MMM d, yyyy h:mm a");
                            } catch (error) {
                              return "Invalid date";
                            }
                          })() : "Not specified"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

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
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
            </Text>
          </Page>

          {/* Second Page - Requirements */}
          <Page key={`${index}-requirements`} size="A4" style={styles.page} wrap>
            <ReportHeader />
            <View style={[styles.eventContainer, { borderBottom: 'none' }]}>
              <Text style={styles.eventTitle}>
                EVENT REQUIREMENTS - {(event.title && typeof event.title === 'string') 
                  ? sanitizeText(event.title).toUpperCase() 
                  : 'UNTITLED EVENT'}
              </Text>

              {/* Department Requirements */}
              {event.departmentRequirements && event.departmentRequirements.length > 0 ? (
                event.departmentRequirements.map((dept, deptIndex) => (
                  <View key={deptIndex} style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>{dept.departmentName}</Text>
                    {dept.requirements.map((req, reqIndex) => {
                      const requirement = typeof req === 'string' ? { name: req } : req;
                      return (
                        <View key={`${deptIndex}-${reqIndex}`} style={{ marginBottom: reqIndex < dept.requirements.length - 1 ? 10 : 0 }}>
                          <Text style={[styles.listItem, { marginBottom: 2 }]}>
                            • {requirement.name}
                          </Text>
                          {requirement.note && (
                            <Text style={[styles.listItem, { 
                              paddingLeft: 20,
                              marginTop: 2,
                              marginBottom: 4,
                              fontSize: 9,
                              color: '#666666',
                              fontStyle: 'italic'
                            }]}>
                              Note: {requirement.note}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))
              ) : (
                <Text style={[styles.listItem, { fontStyle: 'italic' }]}>
                  No requirements specified for this event.
                </Text>
              )}
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              © {new Date().getFullYear()} Provincial Government of Bataan - Event Management System
            </Text>
          </Page>
        </>
      ))}
    </Document>
  );
};

export default EventReportPDF;
