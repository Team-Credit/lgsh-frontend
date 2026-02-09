from django.urls import path
from . import views

urlpatterns = [
    path('ai-summary', views.SpiderAiSummaryView.as_view(), name='spider-ai-summary'),
    path('ai-summary/', views.SpiderAiSummaryView.as_view(), name='spider-ai-summary-slash'),
    path('generate-pdf', views.SpiderPdfView.as_view(), name='spider-generate-pdf'),
    path('generate-pdf/', views.SpiderPdfView.as_view(), name='spider-generate-pdf-slash'),
]
