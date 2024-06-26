import {
  Box,
  Button,
  FormLabel,
  FormControl,
  FormHelperText,
  Input,
} from "@chakra-ui/react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { Rental } from "../../common/model";

interface TakeRentalFormProps {
  label?: string;
  rental: Rental;
  onSubmit: (data: { days: number }) => void;
}

export const TakeRentalForm = ({
  label = "Rent",
  rental,
  onSubmit,
}: TakeRentalFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<{ days: number }>({
    mode: "onChange",
    defaultValues: {
      days: 1,
    },
  });

  const maxDays = useMemo(() => rental.maxDays, [rental]);

  return (
    <>
      <FormControl isInvalid={!isValid}>
        <Box pb="6">
          <Controller
            name="days"
            control={control}
            rules={{
              required: true,
              min: 1,
              max: { value: maxDays, message: "Exceeds maximum rental period" },
              validate: (value) => {
                return !isNaN(value);
              },
            }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <FormControl isInvalid={Boolean(error)}>
                <FormLabel htmlFor="cost">Days</FormLabel>
                <Input
                  name="days"
                  placeholder="Enter"
                  value={value}
                  onChange={onChange}
                />
                <FormHelperText>
                  {error?.message?.length
                    ? error.message
                    : "The number of days you wish to rent"}
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>
      </FormControl>
      <Button variant="primary" w="100%" onClick={handleSubmit(onSubmit)}>
        {label}
      </Button>
    </>
  );
};
