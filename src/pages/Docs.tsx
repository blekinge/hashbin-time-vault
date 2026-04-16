import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import Layout from "@/components/Layout";
import { API_BASE } from "@/lib/api";

const SPEC_URL = `${API_BASE}/openapi.json`;

const Docs = () => (
  <Layout>
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">API Documentation</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <SwaggerUI url={SPEC_URL} />
      </div>
    </div>
  </Layout>
);

export default Docs;
