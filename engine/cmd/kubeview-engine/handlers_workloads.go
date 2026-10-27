package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerWorkloadHandlers(server *ipc.Server, mgr *cluster.Manager) {
	// Method: pods.list
	server.Register("pods.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListPodsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()

		res, err := mgr.ListPods(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list pods: %v", err),
			}
		}
		return res, nil
	})

	// Method: deployments.list
	server.Register("deployments.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListDeploymentsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()

		res, err := mgr.ListDeployments(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list deployments: %v", err),
			}
		}
		return res, nil
	})

	// Method: replicasets.list
	server.Register("replicasets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListReplicaSetsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()

		res, err := mgr.ListReplicaSets(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list replicasets: %v", err),
			}
		}
		return res, nil
	})

	// Method: statefulsets.list
	server.Register("statefulsets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListStatefulSetsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()

		res, err := mgr.ListStatefulSets(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to list statefulsets: %v", err),
			}
		}
		return res, nil
	})

	// Method: daemonsets.list
	server.Register("daemonsets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListDaemonSetsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()
		res, err := mgr.ListDaemonSets(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list daemonsets: %v", err)}
		}
		return res, nil
	})

	// Method: jobs.list
	server.Register("jobs.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListJobsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()
		res, err := mgr.ListJobs(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list jobs: %v", err)}
		}
		return res, nil
	})

	// Method: cronjobs.list
	server.Register("cronjobs.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ListCronJobsParams
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		ctxName := p.ContextName
		if ctxName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				ctxName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 16*time.Second)
		defer cancel()
		res, err := mgr.ListCronJobs(ctx, ctxName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list cronjobs: %v", err)}
		}
		return res, nil
	})

	// Method: pods.logs
	server.Register("pods.logs", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.PodLogsParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		res, err := mgr.GetPodLogs(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrK8sConnFailed,
				Message: fmt.Sprintf("Failed to get pod logs: %v", err),
			}
		}
		return res, nil
	})

	// Method: deployments.yaml
	server.Register("deployments.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName    string `json:"contextName"`
			Namespace      string `json:"namespace"`
			DeploymentName string `json:"deploymentName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetDeploymentYaml(ctx, p.ContextName, p.Namespace, p.DeploymentName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get deployment YAML: %v", err)}
		}
		return res, nil
	})

	// Method: replicasets.yaml
	server.Register("replicasets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName    string `json:"contextName"`
			Namespace      string `json:"namespace"`
			ReplicaSetName string `json:"replicaSetName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetReplicaSetYaml(ctx, p.ContextName, p.Namespace, p.ReplicaSetName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get replicaset YAML: %v", err)}
		}
		return res, nil
	})

	// Method: statefulsets.yaml
	server.Register("statefulsets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName     string `json:"contextName"`
			Namespace       string `json:"namespace"`
			StatefulSetName string `json:"statefulSetName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetStatefulSetYaml(ctx, p.ContextName, p.Namespace, p.StatefulSetName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get statefulset YAML: %v", err)}
		}
		return res, nil
	})

	// Method: daemonsets.yaml
	server.Register("daemonsets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName   string `json:"contextName"`
			Namespace     string `json:"namespace"`
			DaemonSetName string `json:"daemonSetName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetDaemonSetYaml(ctx, p.ContextName, p.Namespace, p.DaemonSetName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get daemonset YAML: %v", err)}
		}
		return res, nil
	})

	// Method: jobs.yaml
	server.Register("jobs.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			JobName     string `json:"jobName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetJobYaml(ctx, p.ContextName, p.Namespace, p.JobName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get job YAML: %v", err)}
		}
		return res, nil
	})

	// Method: cronjobs.yaml
	server.Register("cronjobs.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			CronJobName string `json:"cronJobName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		res, err := mgr.GetCronJobYaml(ctx, p.ContextName, p.Namespace, p.CronJobName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get cronjob YAML: %v", err)}
		}
		return res, nil
	})

	// Method: pods.yaml
	server.Register("pods.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			PodName     string `json:"podName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetPodYaml(ctx, p.ContextName, p.Namespace, p.PodName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to get pod YAML: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.events
	server.Register("pods.events", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			PodName     string `json:"podName"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInvalidParams,
				Message: fmt.Sprintf("Invalid params: %v", err),
			}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		res, err := mgr.GetPodEvents(ctx, p.ContextName, p.Namespace, p.PodName)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to get pod events: %v", err),
			}
		}
		return res, nil
	})
}
