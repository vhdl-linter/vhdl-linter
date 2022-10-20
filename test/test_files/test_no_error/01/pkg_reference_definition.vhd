package pkg_reference_definition is
  type test is ('U',                    -- Uninitialized
                'X',                    -- Forcing  Unknown
                '0',                    -- Forcing  0
                '1',                    -- Forcing  1
                'Z',                    -- High Impedance
                'W',                    -- Weak     Unknown
                'L',                    -- Weak     0
                'H',                    -- Weak     1
                '-'                     -- Don't care
                );
end package;
