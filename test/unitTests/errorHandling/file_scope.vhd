-- entarch
entity test1 is
end entity;
architecture arch of test1 is
begin
end architecture;
mySignal_out <= '1';  -- A nonsense syntax error outside a design entity
entity test2 is
end entity;
architecture arch of test2 is

begin

end architecture;
