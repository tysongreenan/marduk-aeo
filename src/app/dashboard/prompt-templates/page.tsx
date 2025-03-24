'use client';

import { useState, useEffect } from 'react';
import { PromptTemplate, promptTemplateService } from '@/lib/prompt-templates';

export default function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const templates = await promptTemplateService.listTemplates();
        setTemplates(templates);
        setError(null);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load templates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Initial form state
  const initialFormState: PromptTemplate = {
    name: '',
    version: '1.0',
    template_text: '',
    purpose: '',
    variables: {},
    metadata: {}
  };

  const [formData, setFormData] = useState<PromptTemplate>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.version.trim()) errors.version = 'Version is required';
    if (!formData.template_text.trim()) errors.template_text = 'Template text is required';
    if (!formData.purpose.trim()) errors.purpose = 'Purpose is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      if (isEditing && formData.id) {
        // Update existing template
        const updated = await promptTemplateService.updateTemplate(formData.id, formData);
        setTemplates(templates.map(t => t.id === updated.id ? updated : t));
      } else {
        // Create new template
        const created = await promptTemplateService.createTemplate(formData);
        setTemplates([created, ...templates]);
      }
      
      // Reset form
      setFormData(initialFormState);
      setIsEditing(false);
      setFormErrors({});
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit template
  const handleEdit = (template: PromptTemplate) => {
    setFormData(template);
    setIsEditing(true);
    window.scrollTo(0, 0);
  };

  // Handle delete template
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setLoading(true);
      await promptTemplateService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Prompt Templates</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Create/Edit Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Template' : 'Create New Template'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  formErrors.version ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.version && (
                <p className="text-red-500 text-xs mt-1">{formErrors.version}</p>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose
            </label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                formErrors.purpose ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.purpose && (
              <p className="text-red-500 text-xs mt-1">{formErrors.purpose}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Text
            </label>
            <textarea
              name="template_text"
              value={formData.template_text}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md ${
                formErrors.template_text ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Use {variable_name} syntax for variables"
            />
            {formErrors.template_text && (
              <p className="text-red-500 text-xs mt-1">{formErrors.template_text}</p>
            )}
          </div>
          
          <div className="flex justify-end">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setFormData(initialFormState);
                  setIsEditing(false);
                  setFormErrors({});
                }}
                className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Templates List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Templates</h2>
        
        {loading && templates.length === 0 ? (
          <p className="text-gray-500">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-gray-500">No templates found. Create your first one!</p>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-500">
                      Version: {template.version} | Purpose: {template.purpose}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => template.id && handleDelete(template.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 border-t pt-2">
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {template.template_text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 