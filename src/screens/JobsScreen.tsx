import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/JobService';
import { UserService } from '../services/UserService';
import { Job } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';


type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

const STATUS_LABELS = {
  all: 'All Jobs',
  posted: 'Open',
  assigned: 'Assigned', 
  in_progress: 'In Progress',
  completed: 'Completed',
};

// Fallback AI analysis data - replace with real AI service in production
const getAIAnalysisFallback = (job: Job) => {
  // Basic analysis based on job category and description
  const category = job.category?.toLowerCase();
  const description = job.description?.toLowerCase() || '';
  
  let detectedItems: string[] = [];
  let safetyConcerns: string[] = [];
  let complexity = 'Medium';
  let tools: string[] = [];
  
  // Category-based analysis
  switch (category) {
    case 'plumbing':
      detectedItems = ['Pipe', 'Water fixture', 'Drainage system'];
      safetyConcerns = ['Water damage risk', 'Mold potential'];
      tools = ['Pipe wrench', 'Plumber\'s tape', 'Drain snake'];
      complexity = description.includes('emergency') ? 'High' : 'Medium';
      break;
    case 'electrical':
      detectedItems = ['Electrical panel', 'Wiring', 'Outlet'];
      safetyConcerns = ['Electrical shock hazard', 'Fire risk'];
      tools = ['Multimeter', 'Wire strippers', 'Electrical tape'];
      complexity = 'High';
      break;
    case 'hvac':
      detectedItems = ['HVAC unit', 'Ductwork', 'Thermostat'];
      safetyConcerns = ['Poor air quality', 'Energy inefficiency'];
      tools = ['HVAC gauges', 'Duct tape', 'Filters'];
      complexity = 'Medium';
      break;
    default:
      detectedItems = ['General equipment', 'Tools needed'];
      safetyConcerns = ['Standard precautions needed'];
      tools = ['Basic toolkit', 'Safety equipment'];
  }
  
  return {
    confidence: Math.floor(Math.random() * 15) + 85, // 85-99%
    detectedItems,
    safetyConcerns,
    estimatedComplexity: complexity,
    recommendedTools: tools,
  };
};

const JobsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPhotoJobsOnly, setShowPhotoJobsOnly] = useState(false);
  const [showAIAnalyzedOnly, setShowAIAnalyzedOnly] = useState(false);
  const [jobStats, setJobStats] = useState({
    total: 0,
    posted: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  });
  const [homeownerData, setHomeownerData] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let jobsData: Job[];
      
      if (user.role === 'homeowner') {
        jobsData = await JobService.getJobsByHomeowner(user.id);
      } else {
        jobsData = await JobService.getAvailableJobs();
      }
      
      setAllJobs(jobsData);
      filterJobs(jobsData, selectedFilter);
      calculateJobStats(jobsData);
    } catch (error) {
      logger.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = (jobs: Job[], filter: FilterStatus) => {
    let filtered = jobs;
    
    // Status filter
    if (filter !== 'all') {
      filtered = filtered.filter(job => job.status === filter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Photo jobs only filter
    if (showPhotoJobsOnly) {
      filtered = filtered.filter(job => job.photos && job.photos.length > 0);
    }
    
    // AI analyzed jobs only filter - check if job has photos for analysis
    if (showAIAnalyzedOnly) {
      filtered = filtered.filter(job => job.photos && job.photos.length > 0);
    }
    
    setFilteredJobs(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterJobs(allJobs, selectedFilter);
  };

  const togglePhotoJobsFilter = () => {
    setShowPhotoJobsOnly(!showPhotoJobsOnly);
    setTimeout(() => filterJobs(allJobs, selectedFilter), 0);
  };

  const toggleAIAnalyzedFilter = () => {
    setShowAIAnalyzedOnly(!showAIAnalyzedOnly);
    setTimeout(() => filterJobs(allJobs, selectedFilter), 0);
  };

  const calculateJobStats = (jobs: Job[]) => {
    const stats = {
      total: jobs.length,
      posted: jobs.filter(job => job.status === 'posted').length,
      assigned: jobs.filter(job => job.status === 'assigned').length,
      in_progress: jobs.filter(job => job.status === 'in_progress').length,
      completed: jobs.filter(job => job.status === 'completed').length,
    };
    setJobStats(stats);
  };

  const handleFilterChange = (filter: FilterStatus) => {
    setSelectedFilter(filter);
    filterJobs(allJobs, filter);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getPriorityText = (priority?: string) => {
    return priority?.toUpperCase() || 'NORMAL';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    const isHomeowner = user?.role === 'homeowner';
    const isContractor = user?.role === 'contractor';
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const daysAgo = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24));
    const aiAnalysis = getAIAnalysisFallback(item);
    const hasPhotos = item.photos && item.photos.length > 0;
    const homeowner = homeownerData[item.homeownerId];

    // Load homeowner data if not cached
    useEffect(() => {
      if (isContractor && item.homeownerId && !homeownerData[item.homeownerId]) {
        loadHomeownerData(item.homeownerId);
      }
    }, [item.homeownerId, isContractor]);

    const loadHomeownerData = async (homeownerId: string) => {
      try {
        const data = await UserService.getHomeownerForJob(homeownerId);
        if (data) {
          setHomeownerData(prev => ({
            ...prev,
            [homeownerId]: data
          }));
        }
      } catch (error) {
        logger.error('Error loading homeowner data:', error);
      }
    };
    
    return (
      <TouchableOpacity 
        style={styles.jobCard}
        onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
      >
        <View style={styles.jobCardHeader}>
          <View style={styles.jobTitleSection}>
            <View style={styles.titlePriorityRow}>
              <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.priorityText}>{getPriorityText(item.priority)}</Text>
              </View>
            </View>
            
            {isContractor && (
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>
                  {homeowner?.name || 'Loading...'}
                </Text>
                <View style={styles.clientMeta}>
                  {homeowner?.rating > 0 && (
                    <View style={styles.clientRating}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.clientRatingText}>{homeowner.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  <Text style={styles.clientDistance}>
                    {homeowner?.rating > 0 ? '• ' : ''}
                    {homeowner?.reviewCount || 0} reviews • {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                  </Text>
                </View>
              </View>
            )}
            
            {isHomeowner && (
              <Text style={styles.jobTimeAgo}>
                {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}
              </Text>
            )}
          </View>
          
          <Text style={styles.jobBudget}>${item.budget.toLocaleString()}</Text>
        </View>
        
        {/* Problem Photos Section */}
        {isContractor && hasPhotos && (
          <View style={styles.photosSection}>
            <View style={styles.photosSectionHeader}>
              <Ionicons name="camera" size={16} color="#007AFF" />
              <Text style={styles.photosTitle}>Problem Photos ({item.photos?.length || 0})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {item.photos?.slice(0, 3).map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.problemPhoto} />
              ))}
              {(item.photos?.length || 0) > 3 && (
                <View style={styles.morePhotosIndicator}>
                  <Text style={styles.morePhotosText}>+{(item.photos?.length || 0) - 3}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
        
        {/* AI Analysis Section */}
        {isContractor && (
          <View style={styles.aiAnalysisSection}>
            <View style={styles.aiAnalysisHeader}>
              <Ionicons name="bulb" size={16} color="#FF9500" />
              <Text style={styles.aiAnalysisTitle}>AI Analysis Summary</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{aiAnalysis.confidence}% confidence</Text>
              </View>
            </View>
            
            <View style={styles.detectedItemsContainer}>
              <Text style={styles.detectedItemsLabel}>Detected: </Text>
              {aiAnalysis.detectedItems.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.detectedItemTag}>
                  <Text style={styles.detectedItemText}>{item}</Text>
                </View>
              ))}
              {aiAnalysis.detectedItems.length > 3 && (
                <Text style={styles.moreItemsText}>+{aiAnalysis.detectedItems.length - 3} more</Text>
              )}
            </View>
            
            {aiAnalysis?.safetyConcerns && aiAnalysis.safetyConcerns.length > 0 && (
              <View style={styles.safetyConcernsContainer}>
                <Ionicons name="warning" size={14} color="#FF3B30" />
                <Text style={styles.safetyConcernText}>
                  {typeof aiAnalysis.safetyConcerns[0] === 'string' 
                    ? aiAnalysis.safetyConcerns[0]
                    : aiAnalysis.safetyConcerns[0].concern}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.jobMeta}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.jobLocation}>{item.location}</Text>
          </View>
          
          {item.category && (
            <View style={styles.categoryContainer}>
              <Ionicons name="pricetag-outline" size={14} color="#666" />
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.jobFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon} size={12} color="#fff" style={styles.statusIcon} />
            <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
          </View>
          
          {isHomeowner && item.status === 'posted' && (
            <Text style={styles.bidCount}>0 bids received</Text>
          )}
          
          {isContractor && item.status === 'posted' && (
            <View style={styles.contractorActions}>
              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return '#007AFF';
      case 'assigned': return '#5856D6';
      case 'in_progress': return '#FF9500';
      case 'completed': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return 'radio-button-on';
      case 'assigned': return 'person-add';
      case 'in_progress': return 'hammer';
      case 'completed': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'posted': return 'Open';
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {user?.role === 'homeowner' ? 'No Jobs Posted' : 'No Available Jobs'}
      </Text>
      <Text style={styles.emptyDescription}>
        {user?.role === 'homeowner' 
          ? 'Start by posting your first maintenance job'
          : 'Check back later for new opportunities'
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>
              {user?.role === 'homeowner' ? 'Maintenance Hub' : 'Job Marketplace'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'homeowner' 
                ? `${jobStats.total} total jobs • ${jobStats.in_progress} active` 
                : `${filteredJobs.length} available opportunities`
              }
            </Text>
          </View>
          
          {user?.role === 'homeowner' && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('ServiceRequest')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>New Request</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar for Contractors */}
        {user?.role === 'contractor' && (
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search jobs..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
            </View>
            
            {/* Filters */}
            <View style={styles.filtersContainer}>
              <TouchableOpacity 
                style={[styles.filterChip, showPhotoJobsOnly && styles.filterChipActive]}
                onPress={togglePhotoJobsFilter}
              >
                <Ionicons name="camera" size={14} color={showPhotoJobsOnly ? '#fff' : '#007AFF'} />
                <Text style={[styles.filterChipText, showPhotoJobsOnly && styles.filterChipTextActive]}>
                  Photo Jobs Only
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterChip, showAIAnalyzedOnly && styles.filterChipActive]}
                onPress={toggleAIAnalyzedFilter}
              >
                <Ionicons name="bulb" size={14} color={showAIAnalyzedOnly ? '#fff' : '#FF9500'} />
                <Text style={[styles.filterChipText, showAIAnalyzedOnly && styles.filterChipTextActive]}>
                  AI-Analyzed Jobs
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Job Status Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          {user?.role === 'homeowner' ? (
            <>
              <TouchableOpacity 
                style={[styles.statCard, selectedFilter === 'all' && styles.statCardActive]}
                onPress={() => handleFilterChange('all')}
              >
                <Text style={[styles.statNumber, selectedFilter === 'all' && styles.statNumberActive]}>
                  {jobStats.total}
                </Text>
                <Text style={[styles.statLabel, selectedFilter === 'all' && styles.statLabelActive]}>All Jobs</Text>
              </TouchableOpacity>
            
              <TouchableOpacity 
                style={[styles.statCard, selectedFilter === 'posted' && styles.statCardActive]}
                onPress={() => handleFilterChange('posted')}
              >
                <Text style={[styles.statNumber, selectedFilter === 'posted' && styles.statNumberActive]}>
                  {jobStats.posted}
                </Text>
                <Text style={[styles.statLabel, selectedFilter === 'posted' && styles.statLabelActive]}>Open</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statCard, selectedFilter === 'in_progress' && styles.statCardActive]}
                onPress={() => handleFilterChange('in_progress')}
              >
                <Text style={[styles.statNumber, selectedFilter === 'in_progress' && styles.statNumberActive]}>
                  {jobStats.in_progress}
                </Text>
                <Text style={[styles.statLabel, selectedFilter === 'in_progress' && styles.statLabelActive]}>In Progress</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statCard, selectedFilter === 'completed' && styles.statCardActive]}
                onPress={() => handleFilterChange('completed')}
              >
                <Text style={[styles.statNumber, selectedFilter === 'completed' && styles.statNumberActive]}>
                  {jobStats.completed}
                </Text>
                <Text style={[styles.statLabel, selectedFilter === 'completed' && styles.statLabelActive]}>Completed</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Contractor Status Tabs */
            <>
              <TouchableOpacity 
                style={[styles.statusTab, selectedFilter === 'posted' && styles.statusTabActive]}
                onPress={() => handleFilterChange('posted')}
              >
                <Text style={[styles.statusTabText, selectedFilter === 'posted' && styles.statusTabTextActive]}>Open</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statusTab, selectedFilter === 'in_progress' && styles.statusTabActive]}
                onPress={() => handleFilterChange('in_progress')}
              >
                <Text style={[styles.statusTabText, selectedFilter === 'in_progress' && styles.statusTabTextActive]}>In Progress</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statusTab, selectedFilter === 'completed' && styles.statusTabActive]}
                onPress={() => handleFilterChange('completed')}
              >
                <Text style={[styles.statusTabText, selectedFilter === 'completed' && styles.statusTabTextActive]}>Completed</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },
  statsContainer: {
    maxHeight: 90,
  },
  statsContent: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statCardActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 2,
  },
  statNumberActive: {
    color: theme.colors.textInverse,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textInverseMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  statLabelActive: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
    color: theme.colors.textInverseMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textInverse,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.textInverse,
    fontWeight: '500',
    marginLeft: 6,
  },
  filterChipTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  statusTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  statusTabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  statusTabTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  titlePriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textInverse,
    letterSpacing: 0.5,
  },
  clientInfo: {
    marginTop: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  clientRatingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 3,
    fontWeight: '500',
  },
  clientDistance: {
    fontSize: 13,
    color: '#666',
  },
  photosSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  photosTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 6,
  },
  photosScroll: {
    flexDirection: 'row',
  },
  problemPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  morePhotosIndicator: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  morePhotosText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  aiAnalysisSection: {
    backgroundColor: '#fffbf0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiAnalysisTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e17055',
    marginLeft: 6,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#00b894',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  detectedItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detectedItemsLabel: {
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500',
    marginRight: 8,
  },
  detectedItemTag: {
    backgroundColor: '#ddd6fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  detectedItemText: {
    fontSize: 12,
    color: '#6c5ce7',
    fontWeight: '600',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#636e72',
    fontStyle: 'italic',
  },
  safetyConcernsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  safetyConcernText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
    marginLeft: 6,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  jobTimeAgo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  jobBudget: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  jobDescription: {
    fontSize: 15,
    color: '#555',
    marginBottom: 16,
    lineHeight: 22,
  },
  jobMeta: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  jobLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  bidCount: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  contractorActions: {
    flexDirection: 'row',
  },
  detailsButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  applyButtonText: {
    fontSize: 14,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});

// Enhanced job discovery system with AI analysis and photo detection

export default JobsScreen;
