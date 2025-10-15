import { gql } from '@apollo/client/core';
import { Command } from 'commander';
import { apiClient } from '../services/api-client.service';

const GET_CUSTOMERS_QUERY = gql`
  query GetCustomers($filter: CustomerFilter) {
    getCustomers(filter: $filter) {
      totalCount
      edges {
        node {
          customerCode
          category
          customerName
          isActive
          europeanUnionVatNumber
        }
      }
    }
  }
`;

export const customersCommand = new Command('customers')
  .description('Customer related commands')
  .argument('<filepath>', 'Path to the JSON file containing the customer data')
  .action(async (filepath: string) => {
    console.log('Action: Create Customers');
    console.log(`File path received: ${filepath}`);
    console.log('Attempting to connect to the API...');

    try {
      const queryVariables = {
        filter: {
          language_equals: 'Bri',
        },
      };

      const { data } = await apiClient.query({
        query: GET_CUSTOMERS_QUERY,
        variables: queryVariables,
      });

      console.log('✅ API Connection successful! Data received:');
      console.log(JSON.stringify(data, null, 2)); // Imprime os dados formatados

      process.exit(0);
    } catch (error) {
      console.error('❌ An error occurred while contacting the API:');
      // O objeto de erro do Apollo é complexo, vamos imprimir as partes importantes
      if (error.graphQLErrors) console.error('GraphQL Errors:', error.graphQLErrors);
      if (error.networkError) console.error('Network Error:', error.networkError);
      if (!error.graphQLErrors && !error.networkError) console.error(error.message);

      process.exit(1);
    }
  });
