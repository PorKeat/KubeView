package contexts

type Context struct {
	Name      string
	Cluster   string
	Server    string
	User      string
	Namespace string
	IsCurrent bool
	Provider  string
	AuthType  string
}

type ListResult struct {
	CurrentContext string
	Contexts       []Context
	ConfigPath     string
}

type SwitchResult struct {
	ActiveContext string
	Context       Context
	Status        string
}
