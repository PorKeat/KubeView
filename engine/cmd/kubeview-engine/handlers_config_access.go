package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kubeview/engine/internal/cluster"
	"github.com/kubeview/engine/internal/ipc"
)

func registerConfigAccessHandlers(server *ipc.Server, mgr *cluster.Manager) {
	// Method: configmaps.list
	server.Register("configmaps.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListConfigMaps(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list ConfigMaps: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.yaml
	server.Register("configmaps.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
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
		res, err := mgr.GetConfigMapYaml(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get ConfigMap YAML: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.list
	server.Register("secrets.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListSecrets(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list Secrets: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.yaml
	server.Register("secrets.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
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
		res, err := mgr.GetSecretYaml(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get Secret YAML: %v", err)}
		}
		return res, nil
	})

	// Method: persistentvolumes.list
	server.Register("persistentvolumes.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListPersistentVolumes(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list PersistentVolumes: %v", err)}
		}
		return res, nil
	})

	// Method: persistentvolumes.yaml
	server.Register("persistentvolumes.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Name        string `json:"name"`
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
		res, err := mgr.GetPersistentVolumeYaml(ctx, p.ContextName, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get PersistentVolume YAML: %v", err)}
		}
		return res, nil
	})

	// Method: storageclasses.list
	server.Register("storageclasses.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListStorageClasses(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list StorageClasses: %v", err)}
		}
		return res, nil
	})

	// Method: storageclasses.yaml
	server.Register("storageclasses.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Name        string `json:"name"`
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
		res, err := mgr.GetStorageClassYaml(ctx, p.ContextName, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get StorageClass YAML: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.editData
	server.Register("configmaps.editData", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetConfigMapEditData(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to load ConfigMap editor: %v", err)}
		}
		return res, nil
	})

	// Method: configmaps.apply
	server.Register("configmaps.apply", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.ConfigMapUpdateParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ApplyConfigMap(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to update ConfigMap: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.reveal
	server.Register("secrets.reveal", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetSecretEditData(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to reveal Secret editor: %v", err)}
		}
		return res, nil
	})

	// Method: secrets.apply
	server.Register("secrets.apply", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p cluster.SecretUpdateParams
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ApplySecret(ctx, p)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to update Secret: %v", err)}
		}
		return res, nil
	})

	// Method: serviceaccounts.list
	server.Register("serviceaccounts.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.ListServiceAccounts(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list ServiceAccounts: %v", err)}
		}
		return res, nil
	})

	// Method: serviceaccounts.yaml
	server.Register("serviceaccounts.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Name        string `json:"name"`
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
		res, err := mgr.GetServiceAccountYaml(ctx, p.ContextName, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get ServiceAccount YAML: %v", err)}
		}
		return res, nil
	})

	// Method: rbac.list
	server.Register("rbac.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListRBACResources(ctx, p.ContextName, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list RBAC resources: %v", err)}
		}
		return res, nil
	})

	// Method: rbac.yaml
	server.Register("rbac.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Namespace   string `json:"namespace"`
			Kind        string `json:"kind"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetRBACResourceYaml(ctx, p.ContextName, p.Kind, p.Namespace, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get RBAC YAML: %v", err)}
		}
		return res, nil
	})

	// Method: crds.list
	server.Register("crds.list", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
		}
		if len(params) > 0 {
			_ = json.Unmarshal(params, &p)
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListCRDs(ctx, p.ContextName)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list CustomResourceDefinitions: %v", err)}
		}
		return res, nil
	})

	// Method: crds.yaml
	server.Register("crds.yaml", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Name        string `json:"name"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		res, err := mgr.GetCRDYaml(ctx, p.ContextName, p.Name)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInternalError, Message: fmt.Sprintf("Failed to get CRD YAML: %v", err)}
		}
		return res, nil
	})

	// Method: crds.instances
	server.Register("crds.instances", func(params json.RawMessage) (interface{}, *ipc.RPCError) {
		var p struct {
			ContextName string `json:"contextName"`
			Group       string `json:"group"`
			Version     string `json:"version"`
			Resource    string `json:"resource"`
			Namespace   string `json:"namespace"`
		}
		if err := json.Unmarshal(params, &p); err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrCodeInvalidParams, Message: fmt.Sprintf("Invalid params: %v", err)}
		}
		if p.ContextName == "" {
			if listRes, err := mgr.ListContexts(); err == nil {
				p.ContextName = listRes.CurrentContext
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		res, err := mgr.ListCustomResourceInstances(ctx, p.ContextName, p.Group, p.Version, p.Resource, p.Namespace)
		if err != nil {
			return nil, &ipc.RPCError{Code: ipc.ErrK8sConnFailed, Message: fmt.Sprintf("Failed to list custom resources: %v", err)}
		}
		return res, nil
	})
}
