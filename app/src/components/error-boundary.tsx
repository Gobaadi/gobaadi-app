import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/hooks/use-translation';

interface Props {
  children: ReactNode;
}

type T = ReturnType<typeof useTranslation>['t'];

interface BoundaryProps extends Props {
  t: T;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryInner extends Component<BoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>

            <Text style={styles.title}>{this.props.t('errorBoundary.title')}</Text>
            <Text style={styles.description}>
              {this.props.t('errorBoundary.description')}
            </Text>

            {this.state.error && (
              <ScrollView style={styles.errorDetails} contentContainerStyle={styles.errorDetailsContent}>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{this.props.t('errorBoundary.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  const { t } = useTranslation();
  return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#1A1817',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF0E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1817',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#7C7672',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorDetails: {
    maxHeight: 180,
    width: '100%',
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6E1DC',
    marginBottom: 24,
  },
  errorDetailsContent: {
    paddingBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#BD632F',
    fontWeight: '600',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  stackText: {
    fontSize: 10,
    color: '#9C9690',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#BD632F',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
