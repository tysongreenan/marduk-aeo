'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Types for brands
interface Brand {
  id?: string;
  name: string;
  organization_id: string;
  website?: string;
  description?: string;
  industry?: string;
  business_model?: string;
  target_audience?: string;
  unique_value_props?: Record<string, string | number | boolean>;
  created_at?: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        // In a real app, you'd fetch this from Supabase
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setBrands(data || []);
      } catch (err) {
        console.error('Error fetching brands:', err);
        setError('Failed to load brands. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBrands();
  }, []);
  
  // Initial form state
  const initialFormState: Brand = {
    name: '',
    organization_id: '', // In a real app, you'd get this from auth context
    website: '',
    description: '',
    industry: '',
    business_model: '',
    target_audience: '',
  };
  
  const [formData, setFormData] = useState<Brand>(initialFormState);
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
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // In a real app, you'd set the organization_id from auth context
      formData.organization_id = 'temp-org-id'; 
      
      if (isEditing && formData.id) {
        // Update existing brand
        const { data, error } = await supabase
          .from('brands')
          .update({
            name: formData.name,
            website: formData.website,
            description: formData.description,
            industry: formData.industry,
            business_model: formData.business_model,
            target_audience: formData.target_audience,
          })
          .eq('id', formData.id)
          .select();
        
        if (error) throw error;
        
        setBrands(brands.map(b => b.id === formData.id ? data[0] : b));
      } else {
        // Create new brand
        const { data, error } = await supabase
          .from('brands')
          .insert([formData])
          .select();
        
        if (error) throw error;
        
        setBrands([data[0], ...brands]);
      }
      
      // Reset form
      setFormData(initialFormState);
      setIsEditing(false);
      setFormErrors({});
    } catch (err) {
      console.error('Error saving brand:', err);
      setError('Failed to save brand. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle edit brand
  const handleEdit = (brand: Brand) => {
    setFormData(brand);
    setIsEditing(true);
    window.scrollTo(0, 0);
  };
  
  // Handle delete brand
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setBrands(brands.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting brand:', err);
      setError('Failed to delete brand. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Brands</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Create/Edit Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Brand' : 'Create New Brand'}
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
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Model
              </label>
              <input
                type="text"
                name="business_model"
                value={formData.business_model || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience
              </label>
              <input
                type="text"
                name="target_audience"
                value={formData.target_audience || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
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
              {loading ? 'Saving...' : isEditing ? 'Update Brand' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Brands List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Brands</h2>
        
        {loading && brands.length === 0 ? (
          <p className="text-gray-500">Loading brands...</p>
        ) : brands.length === 0 ? (
          <p className="text-gray-500">No brands found. Create your first one!</p>
        ) : (
          <div className="space-y-4">
            {brands.map((brand) => (
              <div key={brand.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{brand.name}</h3>
                    {brand.website && (
                      <a 
                        href={brand.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {brand.website}
                      </a>
                    )}
                    {brand.industry && (
                      <p className="text-sm text-gray-500 mt-1">
                        Industry: {brand.industry}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/brands/${brand.id}`}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleEdit(brand)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => brand.id && handleDelete(brand.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {brand.description && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-sm text-gray-700">{brand.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 