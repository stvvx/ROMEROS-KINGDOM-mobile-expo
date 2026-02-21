Write-Host "Testing Registration and Login"
Write-Host "=============================" 
Write-Host ""

# Test Registration
Write-Host "1. Testing Registration..."
$regBody = @{name='Alice Smith'; email='alice@example.com'; password='SecurePass123'} | ConvertTo-Json

Try {
    $regResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/register" -Method Post -ContentType "application/json" -Body $regBody -UseBasicParsing
    Write-Host "[SUCCESS] Registration passed" -ForegroundColor Green
    $regData = $regResponse.Content | ConvertFrom-Json
    $token = $regData.token
    Write-Host "Token obtained: $($token.Substring(0, 20))..."
} Catch {
    Write-Host "[FAILED] Registration failed" -ForegroundColor Red
    $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "2. Testing Login..."
$loginBody = @{email='alice@example.com'; password='SecurePass123'} | ConvertTo-Json

Try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/login" -Method Post -ContentType "application/json" -Body $loginBody -UseBasicParsing
    Write-Host "[SUCCESS] Login passed" -ForegroundColor Green
    $loginData = $loginResponse.Content | ConvertFrom-Json
    Write-Host "User: $($loginData.user.name)"
    Write-Host "Email: $($loginData.user.email)"
    Write-Host "Token: $($loginData.token.Substring(0, 20))..."
} Catch {
    Write-Host "[FAILED] Login failed" -ForegroundColor Red
    $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] All tests passed!" -ForegroundColor Green
