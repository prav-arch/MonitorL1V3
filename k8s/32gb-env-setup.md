# L1 Monitoring Deployment Guide for 32GB RAM Environments

This guide provides optimized deployment configurations for running the L1 Monitoring application on a Kubernetes cluster with 32GB of RAM. These optimizations ensure efficient resource utilization while maintaining high performance for all components.

## Optimized Resource Allocations

The deployment files have been optimized for a 32GB RAM environment with the following resource allocations:

| Component | Memory Request | Memory Limit | CPU Request | CPU Limit |
|-----------|---------------|--------------|-------------|-----------|
| OLLAMA | 4Gi | 8Gi | 2000m | 4000m |
| ClickHouse | 4Gi | 8Gi | 1000m | 2000m |
| PostgreSQL | 1Gi | 2Gi | 500m | 1000m |
| Application | 1Gi | 2Gi | 500m | 1000m |

## Storage Allocations

Persistent volume claims have been optimized for better performance:

| Component | Storage Allocation |
|-----------|-------------------|
| OLLAMA | 30Gi |
| ClickHouse | 40Gi |
| PostgreSQL | 20Gi |

## Application Scaling

The application has been configured to run with 3 replicas to better distribute load and provide redundancy.

## Deployment Instructions

1. Ensure your Kubernetes cluster meets the minimum requirements (32GB RAM, 8 CPU cores)
2. Clone the repository and navigate to the k8s directory
3. Create a copy of the secrets template:
   ```bash
   cp secrets/secrets-template.yaml secrets/secrets.yaml
   ```
4. Edit the secrets.yaml file with your actual values (Base64 encoded)
5. Run the deployment script:
   ```bash
   ./deploy-with-clickhouse.sh
   ```

## Memory Usage Analysis

With these optimizations, the total memory allocation is approximately:

- OLLAMA: 8Gi (with room for larger models)
- ClickHouse: 8Gi (optimized for analytic workloads)
- PostgreSQL: 2Gi (fallback database)
- Application (3 replicas): 6Gi
- System and Kubernetes overhead: ~6Gi
- **Total**: ~30Gi out of 32Gi available

This provides optimal performance while leaving a small buffer for system operations.

## Performance Considerations

1. **OLLAMA Performance**: With 8Gi of memory allocated to OLLAMA, the Llama2 model will run efficiently even when processing multiple requests simultaneously.

2. **ClickHouse Analytics**: The increased memory allocation to ClickHouse (8Gi) significantly improves query performance for log analytics, especially for complex aggregations and filtering operations.

3. **Application Scaling**: Running 3 replicas ensures high availability and better load distribution. The application is designed to be stateless, making horizontal scaling effective.

4. **Storage Optimization**: Increased storage allocations ensure that components have enough space for logs, models, and database operations without experiencing performance degradation.

## Monitoring Resource Usage

After deployment, monitor resource usage to fine-tune these allocations if necessary:

```bash
# Check pod resource usage
kubectl top pods

# Check node resource usage
kubectl top nodes
```

## Further Optimizations

If you have specific workload patterns, consider these additional optimizations:

1. **High Analytics Load**: Increase ClickHouse memory up to 12Gi for better query performance
2. **LLM-Intensive Usage**: Increase OLLAMA memory up to 12Gi for faster inference
3. **Lower Latency Requirements**: Add an additional application replica (up to 5 total)

## Troubleshooting

If you encounter resource pressure:

1. Check if any pod is being OOM-killed:
   ```bash
   kubectl describe pods | grep -A 5 "Last State"
   ```

2. Verify that the node has enough allocatable resources:
   ```bash
   kubectl describe nodes | grep -A 5 "Allocatable"
   ```