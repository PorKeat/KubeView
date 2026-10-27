package cluster

import (
	"fmt"
	"sort"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
)

// summarizeWarningEvents converts warning events into display rows, newest
// first, capped at the top 10. It also returns the total warning count before
// truncation.
func summarizeWarningEvents(eventList *corev1.EventList) ([]PodEventItem, int) {
	var warningItems []PodEventItem
	if eventList != nil {
		for _, e := range eventList.Items {
			if e.Type == corev1.EventTypeWarning {
				ts := e.LastTimestamp.Time.Format(time.RFC3339)
				if e.LastTimestamp.IsZero() {
					ts = e.EventTime.Time.Format(time.RFC3339)
				}
				warningItems = append(warningItems, PodEventItem{
					Type:                    e.Type,
					Reason:                  e.Reason,
					Message:                 e.Message,
					Count:                   e.Count,
					LastTimestamp:           ts,
					Source:                  e.Source.Component,
					InvolvedObjectKind:      e.InvolvedObject.Kind,
					InvolvedObjectName:      e.InvolvedObject.Name,
					InvolvedObjectNamespace: e.InvolvedObject.Namespace,
				})
			}
		}
	}

	// Sort events latest first and take top 10 for the incident list.
	warningEventCount := len(warningItems)
	sort.Slice(warningItems, func(i, j int) bool {
		return warningItems[i].LastTimestamp > warningItems[j].LastTimestamp
	})
	if len(warningItems) > 10 {
		warningItems = warningItems[:10]
	}

	return warningItems, warningEventCount
}

// summarizeWorkloads computes readiness/degradation counts per workload
// controller from the pre-fetched lists.
func summarizeWorkloads(depsList *appsv1.DeploymentList, rssList *appsv1.ReplicaSetList, stssList *appsv1.StatefulSetList, dssList *appsv1.DaemonSetList, jobsList *batchv1.JobList, cronJobsList *batchv1.CronJobList) WorkloadsSummary {
	var workloads WorkloadsSummary

	if depsList != nil {
		workloads.Deployments.Total = len(depsList.Items)
		for _, d := range depsList.Items {
			desired := int32(1)
			if d.Spec.Replicas != nil {
				desired = *d.Spec.Replicas
			}
			if desired == 0 || d.Status.ReadyReplicas >= desired {
				workloads.Deployments.Ready++
			} else {
				workloads.Deployments.Degraded++
				workloads.Deployments.UnreadyList = append(workloads.Deployments.UnreadyList, fmt.Sprintf("%s/%s (%d/%d)", d.Namespace, d.Name, d.Status.ReadyReplicas, desired))
			}
		}
	}

	if stssList != nil {
		workloads.StatefulSets.Total = len(stssList.Items)
		for _, s := range stssList.Items {
			desired := int32(1)
			if s.Spec.Replicas != nil {
				desired = *s.Spec.Replicas
			}
			if desired == 0 || s.Status.ReadyReplicas >= desired {
				workloads.StatefulSets.Ready++
			} else {
				workloads.StatefulSets.Degraded++
				workloads.StatefulSets.UnreadyList = append(workloads.StatefulSets.UnreadyList, fmt.Sprintf("%s/%s (%d/%d)", s.Namespace, s.Name, s.Status.ReadyReplicas, desired))
			}
		}
	}

	if dssList != nil {
		workloads.DaemonSets.Total = len(dssList.Items)
		for _, d := range dssList.Items {
			desired := d.Status.DesiredNumberScheduled
			if desired == 0 || d.Status.NumberReady >= desired {
				workloads.DaemonSets.Ready++
			} else {
				workloads.DaemonSets.Degraded++
				workloads.DaemonSets.UnreadyList = append(workloads.DaemonSets.UnreadyList, fmt.Sprintf("%s/%s (%d/%d)", d.Namespace, d.Name, d.Status.NumberReady, desired))
			}
		}
	}

	if rssList != nil {
		workloads.ReplicaSets.Total = len(rssList.Items)
		for _, rs := range rssList.Items {
			desired := int32(1)
			if rs.Spec.Replicas != nil {
				desired = *rs.Spec.Replicas
			}
			if desired == 0 || rs.Status.ReadyReplicas >= desired {
				workloads.ReplicaSets.Ready++
			} else {
				workloads.ReplicaSets.Degraded++
				workloads.ReplicaSets.UnreadyList = append(workloads.ReplicaSets.UnreadyList, fmt.Sprintf("%s/%s (%d/%d)", rs.Namespace, rs.Name, rs.Status.ReadyReplicas, desired))
			}
		}
	}

	if jobsList != nil {
		workloads.Jobs.Total = len(jobsList.Items)
		for i := range jobsList.Items {
			switch resolveJobStatus(&jobsList.Items[i]) {
			case "Complete", "Running", "Pending":
				workloads.Jobs.Ready++
			case "Failed":
				workloads.Jobs.Degraded++
			}
		}
	}

	if cronJobsList != nil {
		workloads.CronJobs.Total = len(cronJobsList.Items)
		for i := range cronJobsList.Items {
			cj := &cronJobsList.Items[i]
			if cj.Spec.Suspend == nil || !*cj.Spec.Suspend {
				workloads.CronJobs.Ready++
			}
		}
	}

	return workloads
}
