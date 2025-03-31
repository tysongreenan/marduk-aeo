import {
    Box,
    Heading,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
} from '@chakra-ui/react'
import { CostProjectionData } from '../types'

interface Props {
    data: CostProjectionData | undefined;
}

export default function CostProjection({ data }: Props) {
    if (!data) {
        return <Box>Loading cost projections...</Box>
    }

    const percentageUsed = ((data.current_cost / (data.current_cost + data.budget_remaining)) * 100).toFixed(1)
    const projectedOverBudget = data.projected_cost > (data.current_cost + data.budget_remaining)

    return (
        <Box>
            <Heading size="md" mb={4}>Cost Projection</Heading>
            <SimpleGrid columns={2} spacing={4}>
                <Stat>
                    <StatLabel>Current Cost</StatLabel>
                    <StatNumber>${data.current_cost.toFixed(2)}</StatNumber>
                    <StatHelpText>
                        {percentageUsed}% of budget used
                    </StatHelpText>
                </Stat>
                <Stat>
                    <StatLabel>Budget Remaining</StatLabel>
                    <StatNumber>${data.budget_remaining.toFixed(2)}</StatNumber>
                </Stat>
                <Stat>
                    <StatLabel>Projected Cost</StatLabel>
                    <StatNumber color={projectedOverBudget ? 'red.500' : 'green.500'}>
                        ${data.projected_cost.toFixed(2)}
                    </StatNumber>
                    <StatHelpText>
                        <StatArrow type={projectedOverBudget ? 'increase' : 'decrease'} />
                        {projectedOverBudget ? 'Over budget' : 'Under budget'}
                    </StatHelpText>
                </Stat>
            </SimpleGrid>
        </Box>
    )
} 