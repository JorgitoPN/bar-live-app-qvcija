
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Cuenta',
    question: '¿Cómo creo una cuenta en BarLive?',
    answer: 'Puedes crear una cuenta desde la pantalla de bienvenida proporcionando tu correo electrónico y creando una contraseña segura.',
  },
  {
    category: 'Cuenta',
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Ve a Configuración > Privacidad y Seguridad > Cambiar Contraseña. Recibirás un enlace de restablecimiento en tu correo electrónico.',
  },
  {
    category: 'Cuenta',
    question: '¿Puedo eliminar mi cuenta?',
    answer: 'Sí, puedes eliminar tu cuenta desde Configuración > Eliminar Cuenta. Ten en cuenta que esta acción es permanente y no se puede deshacer.',
  },
  {
    category: 'Locales',
    question: '¿Cómo busco locales cercanos?',
    answer: 'En la pestaña Explorar, activa la ubicación y selecciona el filtro "Cercanos". La app mostrará los locales más próximos a tu ubicación actual.',
  },
  {
    category: 'Locales',
    question: '¿Cómo guardo mis locales favoritos?',
    answer: 'Toca el icono de corazón en la página de detalles del local. Podrás ver todos tus favoritos en tu perfil.',
  },
  {
    category: 'Locales',
    question: '¿Cómo escribo una reseña?',
    answer: 'Visita la página del local y toca el botón "Escribir reseña". Selecciona tu valoración y escribe tu opinión.',
  },
  {
    category: 'Social',
    question: '¿Cómo publico una historia?',
    answer: 'Ve a la pestaña Social y toca el botón "+" en la sección de historias. Puedes subir una foto o tomarla en el momento.',
  },
  {
    category: 'Social',
    question: '¿Cómo sigo a otros usuarios?',
    answer: 'Visita el perfil del usuario y toca el botón "Seguir". Verás sus publicaciones en tu feed social.',
  },
  {
    category: 'Social',
    question: '¿Puedo hacer mi perfil privado?',
    answer: 'Sí, ve a Configuración > Privacidad y Seguridad > Privacidad de cuenta y selecciona "Cuenta privada".',
  },
  {
    category: 'Eventos',
    question: '¿Cómo encuentro eventos cerca de mí?',
    answer: 'Ve a la pestaña Eventos y usa los filtros de ubicación y fecha para encontrar eventos en tu zona.',
  },
  {
    category: 'Eventos',
    question: '¿Puedo crear mis propios eventos?',
    answer: 'Si eres propietario de un local, puedes crear eventos desde la sección de Gestión.',
  },
  {
    category: 'Empleo',
    question: '¿Cómo busco trabajo en hostelería?',
    answer: 'Ve a la pestaña Empleo y explora las ofertas disponibles. Puedes filtrar por provincia, tipo de puesto y tipo de contrato.',
  },
  {
    category: 'Empleo',
    question: '¿Cómo creo mi perfil profesional?',
    answer: 'En la pestaña Empleo, toca "Crear Perfil Profesional" y completa tu información laboral.',
  },
  {
    category: 'Técnico',
    question: 'La app va lenta, ¿qué puedo hacer?',
    answer: 'Intenta limpiar la caché desde Configuración > Datos y Almacenamiento > Limpiar Caché. También asegúrate de tener la última versión de la app.',
  },
  {
    category: 'Técnico',
    question: 'No recibo notificaciones',
    answer: 'Verifica que las notificaciones estén activadas en Configuración > Notificaciones y también en la configuración de tu dispositivo.',
  },
];

export default function CentroAyudaScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = ['Todos', ...Array.from(new Set(FAQ_DATA.map(item => item.category)))];

  const filteredFAQ = selectedCategory === 'Todos' 
    ? FAQ_DATA 
    : FAQ_DATA.filter(item => item.category === selectedCategory);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Centro de Ayuda</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ Items */}
        <View style={styles.faqContainer}>
          {filteredFAQ.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleExpand(index)}
                activeOpacity={0.7}
              >
                <View style={styles.faqQuestionContent}>
                  <Text style={styles.categoryBadge}>{item.category}</Text>
                  <Text style={styles.questionText}>{item.question}</Text>
                </View>
                <IconSymbol
                  ios_icon_name={expandedIndex === index ? 'chevron.up' : 'chevron.down'}
                  android_material_icon_name={expandedIndex === index ? 'expand_less' : 'expand_more'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              
              {expandedIndex === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>¿No encuentras lo que buscas?</Text>
          <Text style={styles.contactDescription}>
            Nuestro equipo de soporte está aquí para ayudarte
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push('/soporte/reportar-problema' as any)}
          >
            <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color={colors.headerText} />
            <Text style={styles.contactButtonText}>Contactar Soporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    paddingVertical: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryButtonTextActive: {
    color: colors.headerText,
  },
  faqContainer: {
    padding: 16,
  },
  faqItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionContent: {
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  answerText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  contactSection: {
    margin: 16,
    padding: 24,
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
});
