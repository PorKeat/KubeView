package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerActionHandlers(server *ipc.Server, mgr *cluster.Manager) {
	// Method: pods.delete
	server.Register("pods.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeletePodParams
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

		if err := mgr.DeletePod(ctx, p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to delete pod: %v", err),
			}
		}
		return map[string]interface{}{"success": true, "podName": p.PodName}, nil
	})

	// Method: pods.restart
	server.Register("pods.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.RestartPodParams
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

		if err := mgr.RestartPod(ctx, p); err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to restart pod: %v", err),
			}
		}
		return map[string]interface{}{"success": true, "restarted": p.PodName}, nil
	})

	// Method: pods.move
	server.Register("pods.move", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.MovePodParams
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

		ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()

		result, err := mgr.MovePod(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to move pod: %v", err),
			}
		}
		return result, nil
	})

	// Method: pods.exec
	server.Register("pods.exec", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ExecPodParams
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

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		res, err := mgr.ExecPod(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Command execution failed: %v", err),
			}
		}
		return res, nil
	})

	// Method: pods.launchDebugContainer
	server.Register("pods.launchDebugContainer", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.LaunchDebugContainerParams
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

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		res, err := mgr.LaunchDebugContainer(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{
				Code:    ipc.ErrCodeInternalError,
				Message: fmt.Sprintf("Failed to launch debug container: %v", err),
			}
		}
		return res, nil
	})

	// Method: deployments.restart
	server.Register("deployments.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.RestartDeployment(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to restart deployment: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: deployments.scale
	server.Register("deployments.scale", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Replicas == nil || *p.Replicas < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and non-negative replicas are required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.ScaleDeployment(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to scale deployment: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "replicas": *p.Replicas}, nil
	})

	// Method: deployments.delete
	server.Register("deployments.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DeploymentActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteDeployment(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete deployment: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: replicasets.scale
	server.Register("replicasets.scale", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ReplicaSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Replicas == nil || *p.Replicas < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and non-negative replicas are required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.ScaleReplicaSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to scale replicaset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "replicas": *p.Replicas}, nil
	})

	// Method: replicasets.delete
	server.Register("replicasets.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ReplicaSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteReplicaSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete replicaset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: statefulsets.restart
	server.Register("statefulsets.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.StatefulSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.RestartStatefulSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to restart statefulset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: statefulsets.scale
	server.Register("statefulsets.scale", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.StatefulSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" || p.Replicas == nil || *p.Replicas < 0 {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name and non-negative replicas are required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.ScaleStatefulSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to scale statefulset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "replicas": *p.Replicas}, nil
	})

	// Method: statefulsets.delete
	server.Register("statefulsets.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.StatefulSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteStatefulSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete statefulset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: daemonsets.restart
	server.Register("daemonsets.restart", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DaemonSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.RestartDaemonSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to restart daemonset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: daemonsets.delete
	server.Register("daemonsets.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.DaemonSetActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteDaemonSet(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete daemonset: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: jobs.delete
	server.Register("jobs.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.JobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteJob(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete job: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: cronjobs.suspend
	server.Register("cronjobs.suspend", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.SetCronJobSuspend(ctx, p, true); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to suspend cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "suspend": true}, nil
	})

	// Method: cronjobs.resume
	server.Register("cronjobs.resume", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.SetCronJobSuspend(ctx, p, false); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to resume cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "suspend": false}, nil
	})

	// Method: cronjobs.delete
	server.Register("cronjobs.delete", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := mgr.DeleteCronJob(ctx, p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to delete cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name}, nil
	})

	// Method: cronjobs.trigger
	server.Register("cronjobs.trigger", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.CronJobActionParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.Name == "" {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: "name is required"}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		jobName, err := mgr.TriggerCronJob(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to trigger cronjob: %v", err)}
		}
		return map[string]interface{}{"success": true, "name": p.Name, "jobName": jobName}, nil
	})
}
