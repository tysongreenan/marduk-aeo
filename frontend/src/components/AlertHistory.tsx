import {
    Box,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge
} from '@chakra-ui/react'
import { Alert } from '../types'

interface Props {
    alerts: Alert[];
}

export default function AlertHistory({ alerts }: Props) {
    const getAlertColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'error':
                return 'red'
            case 'warning':
                return 'yellow'
            case 'info':
                return 'blue'
            default:
                return 'gray'
        }
    }

    return (
        <Box>
            <Heading size="md" mb={4}>Alert History</Heading>
            <Table variant="simple" size="sm">
                <Thead>
                    <Tr>
                        <Th>Time</Th>
                        <Th>Type</Th>
                        <Th>Message</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {alerts.map((alert) => (
                        <Tr key={alert.id}>
                            <Td>{new Date(alert.timestamp).toLocaleString()}</Td>
                            <Td>
                                <Badge colorScheme={getAlertColor(alert.alert_type)}>
                                    {alert.alert_type}
                                </Badge>
                            </Td>
                            <Td>{alert.message}</Td>
                        </Tr>
                    ))}
                    {alerts.length === 0 && (
                        <Tr>
                            <Td colSpan={3} textAlign="center">No alerts to display</Td>
                        </Tr>
                    )}
                </Tbody>
            </Table>
        </Box>
    )
} 