import boto3

transcribe = boto3.client('transcribe', region_name='us-east-1')

try:
    # Test basique - liste les jobs existants
    response = transcribe.list_transcription_jobs(MaxResults=10)
    print("✅ Succès ! Tu as accès à Transcribe")
    print(f"Jobs trouvés: {len(response.get('TranscriptionJobSummaries', []))}")
except Exception as e:
    print(f"❌ Erreur: {type(e).__name__}")
    print(f"Message: {str(e)}")