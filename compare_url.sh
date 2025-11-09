#!/bin/bash
cd /home/user/less.go/packages/less/src/less/less_go
go test -v -run "TestIntegrationSuite/static-urls/urls" 2>&1 | grep -E "(Expected|Actual):" | head -20
