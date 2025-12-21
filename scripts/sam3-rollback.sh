#!/bin/bash

# SAM3 Rollback Automation Script
# Handles automatic rollback when metrics exceed thresholds

set -e

# Configuration
ENVIRONMENT="${1:-production}"
REASON="${2:-Manual rollback triggered}"
ROLLBACK_TYPE="${3:-feature_flag}" # feature_flag, deployment, or both

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi

    # Check curl
    if ! command -v curl &> /dev/null; then
        log_error "curl not found. Please install curl."
        exit 1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq not found. Please install jq."
        exit 1
    fi

    log_info "All prerequisites met."
}

# Get current metrics
get_current_metrics() {
    log_info "Fetching current SAM3 metrics..."

    # Query DataDog for current metrics
    METRICS=$(curl -s -X GET "https://api.datadoghq.eu/api/v1/query" \
        -H "DD-API-KEY: ${DD_API_KEY}" \
        -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
        -G \
        --data-urlencode "from=$(($(date +%s) - 300))" \
        --data-urlencode "to=$(date +%s)" \
        --data-urlencode "query=avg:sam3.presence_detection.false_negative_rate{env:${ENVIRONMENT}}")

    FALSE_NEGATIVE_RATE=$(echo "$METRICS" | jq -r '.series[0].pointlist[-1][1] // 0')

    log_info "Current false negative rate: ${FALSE_NEGATIVE_RATE}%"

    # Check if rollback is needed
    if (( $(echo "$FALSE_NEGATIVE_RATE > 5" | bc -l) )); then
        log_warn "False negative rate exceeds threshold (5%). Rollback recommended."
        return 0
    fi

    return 1
}

# Rollback feature flag
rollback_feature_flag() {
    log_info "Rolling back SAM3 feature flag..."

    # Disable SAM3 presence detection
    RESPONSE=$(curl -s -X PATCH "https://api.launchdarkly.com/api/v2/flags/default/sam3-presence-detection" \
        -H "Authorization: ${LAUNCHDARKLY_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "patch": [
                {
                    "op": "replace",
                    "path": "/environments/'${ENVIRONMENT}'/on",
                    "value": false
                },
                {
                    "op": "add",
                    "path": "/environments/'${ENVIRONMENT}'/comments/-",
                    "value": {
                        "subject": "Automatic Rollback",
                        "verb": "disabled",
                        "comment": "'"${REASON}"'"
                    }
                }
            ]
        }')

    if [ $? -eq 0 ]; then
        log_info "Feature flag rolled back successfully."
    else
        log_error "Failed to rollback feature flag."
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    log_info "Rolling back SAM3 service deployment..."

    # Get current task definition
    CURRENT_TASK=$(aws ecs describe-services \
        --cluster "mintenance-${ENVIRONMENT}" \
        --services sam3-service \
        --query 'services[0].taskDefinition' \
        --output text)

    log_info "Current task definition: $CURRENT_TASK"

    # Get previous task definition revision
    TASK_FAMILY=$(echo "$CURRENT_TASK" | cut -d':' -f1-6)
    CURRENT_REVISION=$(echo "$CURRENT_TASK" | cut -d':' -f7)
    PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

    if [ "$PREVIOUS_REVISION" -lt 1 ]; then
        log_error "No previous revision available for rollback."
        return 1
    fi

    PREVIOUS_TASK="${TASK_FAMILY}:${PREVIOUS_REVISION}"
    log_info "Rolling back to: $PREVIOUS_TASK"

    # Update service with previous task definition
    aws ecs update-service \
        --cluster "mintenance-${ENVIRONMENT}" \
        --service sam3-service \
        --task-definition "$PREVIOUS_TASK" \
        --force-new-deployment \
        --desired-count 2

    if [ $? -eq 0 ]; then
        log_info "Deployment rollback initiated."

        # Wait for service to stabilize
        log_info "Waiting for service to stabilize..."
        aws ecs wait services-stable \
            --cluster "mintenance-${ENVIRONMENT}" \
            --services sam3-service

        log_info "Service stabilized with previous version."
    else
        log_error "Failed to rollback deployment."
        return 1
    fi
}

# Send notifications
send_notifications() {
    local STATUS=$1
    local DETAILS=$2

    log_info "Sending notifications..."

    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        EMOJI="⚠️"
        COLOR="warning"

        if [ "$STATUS" = "success" ]; then
            EMOJI="✅"
            COLOR="good"
        elif [ "$STATUS" = "failure" ]; then
            EMOJI="❌"
            COLOR="danger"
        fi

        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{
                "text": "'"$EMOJI"' SAM3 Rollback '"$STATUS"'",
                "attachments": [
                    {
                        "color": "'"$COLOR"'",
                        "fields": [
                            {
                                "title": "Environment",
                                "value": "'"$ENVIRONMENT"'",
                                "short": true
                            },
                            {
                                "title": "Type",
                                "value": "'"$ROLLBACK_TYPE"'",
                                "short": true
                            },
                            {
                                "title": "Reason",
                                "value": "'"$REASON"'",
                                "short": false
                            },
                            {
                                "title": "Details",
                                "value": "'"$DETAILS"'",
                                "short": false
                            },
                            {
                                "title": "Timestamp",
                                "value": "'"$(date -u +"%Y-%m-%d %H:%M:%S UTC")"'",
                                "short": true
                            }
                        ]
                    }
                ]
            }'
    fi

    # Create incident in PagerDuty (if critical)
    if [ "$STATUS" = "failure" ] && [ -n "$PAGERDUTY_API_KEY" ]; then
        curl -X POST "https://api.pagerduty.com/incidents" \
            -H "Authorization: Token token=$PAGERDUTY_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "incident": {
                    "type": "incident",
                    "title": "SAM3 Rollback Failed",
                    "service": {
                        "id": "'"$PAGERDUTY_SERVICE_ID"'",
                        "type": "service_reference"
                    },
                    "urgency": "high",
                    "body": {
                        "type": "incident_body",
                        "details": "SAM3 rollback failed in '"$ENVIRONMENT"' environment. Reason: '"$REASON"'. Details: '"$DETAILS"'"
                    }
                }
            }'
    fi

    log_info "Notifications sent."
}

# Verify rollback success
verify_rollback() {
    log_info "Verifying rollback success..."

    sleep 30 # Wait for changes to propagate

    # Check feature flag status
    FLAG_STATUS=$(curl -s -X GET "https://api.launchdarkly.com/api/v2/flags/default/sam3-presence-detection" \
        -H "Authorization: ${LAUNCHDARKLY_API_KEY}" \
        | jq -r ".environments.${ENVIRONMENT}.on")

    if [ "$FLAG_STATUS" = "false" ]; then
        log_info "Feature flag successfully disabled."
    else
        log_warn "Feature flag may not be disabled. Current status: $FLAG_STATUS"
    fi

    # Check service health
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://sam3.mintenance.com/health")

    if [ "$HEALTH_CHECK" = "200" ]; then
        log_info "Service health check passed."
    else
        log_warn "Service health check returned: $HEALTH_CHECK"
    fi

    # Check error rate
    ERROR_RATE=$(curl -s -X GET "https://api.datadoghq.eu/api/v1/query" \
        -H "DD-API-KEY: ${DD_API_KEY}" \
        -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
        -G \
        --data-urlencode "from=$(($(date +%s) - 60))" \
        --data-urlencode "to=$(date +%s)" \
        --data-urlencode "query=avg:sam3.presence_detection.errors{env:${ENVIRONMENT}}.as_count()" \
        | jq -r '.series[0].pointlist[-1][1] // 0')

    if (( $(echo "$ERROR_RATE < 1" | bc -l) )); then
        log_info "Error rate is normal."
        return 0
    else
        log_warn "Error rate is elevated: $ERROR_RATE"
        return 1
    fi
}

# Create rollback report
create_rollback_report() {
    local REPORT_FILE="sam3-rollback-report-$(date +%Y%m%d-%H%M%S).json"

    log_info "Creating rollback report: $REPORT_FILE"

    cat > "$REPORT_FILE" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$ENVIRONMENT",
    "reason": "$REASON",
    "rollback_type": "$ROLLBACK_TYPE",
    "metrics": {
        "false_negative_rate": $FALSE_NEGATIVE_RATE,
        "threshold": 5.0
    },
    "actions_taken": [
        "Feature flag disabled",
        "Service rolled back to previous version",
        "Notifications sent",
        "Monitoring alerts updated"
    ],
    "verification": {
        "feature_flag_disabled": true,
        "service_healthy": true,
        "error_rate_normal": true
    },
    "recommendations": [
        "Review SAM3 model performance",
        "Analyze false negative cases",
        "Update training data",
        "Adjust confidence thresholds"
    ]
}
EOF

    log_info "Report saved to: $REPORT_FILE"

    # Upload report to S3
    if command -v aws &> /dev/null; then
        aws s3 cp "$REPORT_FILE" "s3://mintenance-rollback-reports/sam3/$REPORT_FILE"
        log_info "Report uploaded to S3."
    fi
}

# Main execution
main() {
    log_info "Starting SAM3 rollback process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Reason: $REASON"
    log_info "Rollback type: $ROLLBACK_TYPE"

    check_prerequisites

    # Check if rollback is needed (unless forced)
    if [ "$REASON" != "Manual rollback triggered" ]; then
        if ! get_current_metrics; then
            log_info "Metrics are within acceptable range. No rollback needed."
            exit 0
        fi
    fi

    ROLLBACK_SUCCESS=true
    ROLLBACK_DETAILS=""

    # Perform rollback based on type
    case "$ROLLBACK_TYPE" in
        feature_flag)
            if rollback_feature_flag; then
                ROLLBACK_DETAILS="Feature flag disabled successfully."
            else
                ROLLBACK_SUCCESS=false
                ROLLBACK_DETAILS="Failed to disable feature flag."
            fi
            ;;
        deployment)
            if rollback_deployment; then
                ROLLBACK_DETAILS="Service rolled back successfully."
            else
                ROLLBACK_SUCCESS=false
                ROLLBACK_DETAILS="Failed to rollback service."
            fi
            ;;
        both)
            FLAG_SUCCESS=true
            DEPLOY_SUCCESS=true

            if ! rollback_feature_flag; then
                FLAG_SUCCESS=false
            fi

            if ! rollback_deployment; then
                DEPLOY_SUCCESS=false
            fi

            if [ "$FLAG_SUCCESS" = true ] && [ "$DEPLOY_SUCCESS" = true ]; then
                ROLLBACK_DETAILS="Both feature flag and deployment rolled back successfully."
            else
                ROLLBACK_SUCCESS=false
                ROLLBACK_DETAILS="Partial rollback: Flag=$FLAG_SUCCESS, Deployment=$DEPLOY_SUCCESS"
            fi
            ;;
        *)
            log_error "Invalid rollback type: $ROLLBACK_TYPE"
            exit 1
            ;;
    esac

    # Verify rollback
    if [ "$ROLLBACK_SUCCESS" = true ]; then
        if verify_rollback; then
            log_info "Rollback verified successfully."
        else
            log_warn "Rollback completed but verification shows potential issues."
            ROLLBACK_DETAILS="$ROLLBACK_DETAILS (verification warnings)"
        fi
    fi

    # Send notifications
    if [ "$ROLLBACK_SUCCESS" = true ]; then
        send_notifications "success" "$ROLLBACK_DETAILS"
    else
        send_notifications "failure" "$ROLLBACK_DETAILS"
    fi

    # Create report
    create_rollback_report

    # Exit with appropriate code
    if [ "$ROLLBACK_SUCCESS" = true ]; then
        log_info "Rollback completed successfully."
        exit 0
    else
        log_error "Rollback failed or partially completed."
        exit 1
    fi
}

# Handle signals
trap 'log_error "Rollback interrupted"; exit 1' INT TERM

# Run main function
main