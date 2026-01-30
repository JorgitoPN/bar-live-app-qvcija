
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize } from '@/utils/androidScaling';

interface Props {
  onPaymentMethodCreated: (paymentMethodId: string) => void;
  clientSecret?: string;
}

/**
 * ✅ STRIPE CARD INPUT - PAYMENT METHOD COLLECTION
 * 
 * Features:
 * - Stripe CardField for secure card input
 * - Real-time validation
 * - Creates payment method
 * - Handles errors
 */

export default function StripeCardInput({ onPaymentMethodCreated, clientSecret }: Props) {
  const { confirmSetupIntent, createPaymentMethod } = useStripe();
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleCardChange = (cardDetails: any) => {
    setCardComplete(cardDetails.complete);
  };

  const handleCreatePaymentMethod = async () => {
    if (!cardComplete) {
      Alert.alert('Error', 'Por favor completa los datos de la tarjeta');
      return;
    }

    setProcessing(true);
    try {
      if (clientSecret) {
        // Use SetupIntent for trial activation
        const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
          paymentMethodType: 'Card',
        });

        if (error) {
          console.error('[StripeCardInput] SetupIntent error:', error);
          Alert.alert('Error', error.message || 'No se pudo procesar el método de pago');
          return;
        }

        if (setupIntent?.paymentMethodId) {
          onPaymentMethodCreated(setupIntent.paymentMethodId);
        }
      } else {
        // Create payment method directly
        const { paymentMethod, error } = await createPaymentMethod({
          paymentMethodType: 'Card',
        });

        if (error) {
          console.error('[StripeCardInput] PaymentMethod error:', error);
          Alert.alert('Error', error.message || 'No se pudo crear el método de pago');
          return;
        }

        if (paymentMethod?.id) {
          onPaymentMethodCreated(paymentMethod.id);
        }
      }
    } catch (error) {
      console.error('[StripeCardInput] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CardField
        postalCodeEnabled={false}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={{
          backgroundColor: colors.cardBackground,
          textColor: colors.text,
          borderColor: colors.cardBorder,
          borderWidth: 1,
          borderRadius: 12,
        }}
        style={styles.cardField}
        onCardChange={handleCardChange}
      />

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { fontSize: scaleFontSize(14) }]}>
            Procesando...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 16,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 8,
  },
  processingText: {
    color: colors.white,
    fontWeight: '600',
  },
});
