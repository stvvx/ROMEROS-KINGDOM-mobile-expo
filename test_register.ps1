$body = @{name='John Doe'; email='john@newexample.com'; password='password123'} | ConvertTo-Json

Try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/register" -Method Post -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "SUCCESS: Registration worked!"
    Write-Host ""
    $response.Content | ConvertFrom-Json | ConvertTo-Json
} Catch {
    Write-Host "ERROR:"
    $_.Exception.Response.GetResponseStream() | ForEach-Object {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.ReadToEnd()
    }
}
